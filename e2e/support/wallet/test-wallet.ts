import type { BrowserContext, Page } from "@playwright/test";
import {
  createWalletClient,
  hexToBigInt,
  hexToString,
  http,
  isHex,
  numberToHex,
  type Address,
  type Hex,
  type LocalAccount,
  type TypedDataDefinition,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import { injectedProvider, type InjectedProviderInfo } from "./injected-provider";

/**
 * An injected EIP-1193 test wallet.
 *
 * The page gets a thin provider (window.ethereum plus an EIP-6963
 * announcement, as MetaMask by default) whose every request is sent to Node
 * through a binding. Node holds the key: it signs with a viem local
 * account and sends reads and transactions to one JSON-RPC endpoint (the
 * local Anvil fork in the hermetic layer). Keys never enter the page.
 *
 * It is not MetaMask: it proves how the app talks to an injected wallet,
 * not how a real extension behaves. That is the `extension` layer's job.
 */

export type WalletRequestOutcome = "ok" | "error" | "rejected" | "refused";

export type WalletRequest = {
  method: string;
  params?: unknown;
  at: number;
  /**
   * "rejected": the test told the wallet to reject it (code 4001).
   * "refused": eth_sendTransaction while sends are switched off.
   */
  outcome: WalletRequestOutcome;
  error?: { code: number; message: string };
  /** eth_sendTransaction that was sent: the transaction's hash, to look up its receipt. */
  hash?: Hex;
};

/** What a person would be prompted for in a real wallet. */
export type PromptKind = "connection" | "signature" | "transaction" | "chainSwitch";

export interface TestWalletOptions {
  account: LocalAccount;
  /** JSON-RPC endpoint for reads and for sending transactions. */
  rpcUrl: string;
  /** chainId the wallet reports at start; Sepolia unless a test wants the wrong network. */
  chainId?: number;
  /** When false, eth_sendTransaction and wallet_sendCalls are refused and recorded. */
  allowSendTransaction?: boolean;
  /** "atomic" makes the wallet answer EIP-5792 (wallet_sendCalls); "none" answers 4200 like a plain EOA wallet. */
  capabilities?: "none" | "atomic";
  /** How the wallet presents itself to the page; MetaMask by default. */
  identity?: WalletIdentity;
}

type RpcError = { code: number; message: string; data?: unknown };
type BridgeResult = { result?: unknown; error?: RpcError };

const SIGNATURE_METHODS = new Set([
  "personal_sign",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
]);

const EIP5792_METHODS = new Set([
  "wallet_getCapabilities",
  "wallet_sendCalls",
  "wallet_getCallsStatus",
  "wallet_showCallsStatus",
]);

const UNSUPPORTED_METHODS = new Set(["wallet_grantPermissions", "eth_signTransaction"]);

const PROVIDER_ICON =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#f6851b"/><text x="16" y="21" font-size="12" text-anchor="middle" fill="#fff" font-family="sans-serif">E2E</text></svg>',
  ).toString("base64");

/**
 * How the wallet presents itself to the page.
 *
 * "metamask" (default): window.ethereum.isMetaMask plus an EIP-6963
 *   announcement with rdns io.metamask. RainbowKit folds that into its
 *   built-in MetaMask entry, so the picker option is rk-wallet-option-metaMask
 *   and the connection goes through wagmi's MetaMask connector, as it does
 *   for most real users.
 * "generic": an EIP-6963 wallet RainbowKit has never heard of. It is listed
 *   under "Installed" as rk-wallet-option-<rdns> and uses wagmi's plain
 *   injected connector.
 */
export type WalletIdentity = "metamask" | "generic";

export const WALLET_IDENTITIES: Record<WalletIdentity, InjectedProviderInfo & { pickerTestId: string }> = {
  metamask: {
    uuid: "6f0d1b4e-2e2e-4e2e-9e2e-e2e000000001",
    name: "MetaMask",
    icon: PROVIDER_ICON,
    rdns: "io.metamask",
    isMetaMask: true,
    pickerTestId: "rk-wallet-option-metaMask",
  },
  generic: {
    uuid: "6f0d1b4e-2e2e-4e2e-9e2e-e2e000000002",
    name: "E2E Test Wallet",
    icon: PROVIDER_ICON,
    rdns: "io.societyprotocol.e2e-wallet",
    isMetaMask: false,
    pickerTestId: "rk-wallet-option-io.societyprotocol.e2e-wallet",
  },
};

export const USER_REJECTED = 4001;

class WalletRpcError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

/** A prompt the test holds open: nothing is answered until approve() or reject(). */
export type HeldPrompt = {
  /** Resolves when the app has made the request and it is waiting. */
  requested: Promise<void>;
  approve(): void;
  reject(): void;
};

/** Requests of one method that the wallet leaves unanswered: see TestWallet.stopAnswering. */
export type UnansweredMethod = {
  /** How many requests of the method have been caught so far. */
  hits(): number;
  /** Answers the caught requests (as if the wallet woke up) and stops catching new ones. */
  release(): void;
};

type Silence = {
  method: string;
  hits: number;
  released: Promise<void>;
  release(): void;
};

type Hold = {
  kind: PromptKind;
  announce: () => void;
  decision: Promise<"approve" | "reject">;
};

function errorResult(error: unknown): BridgeResult {
  if (error instanceof WalletRpcError) {
    return { error: { code: error.code, message: error.message } };
  }
  const record = (error ?? {}) as { code?: unknown; message?: unknown; data?: unknown };
  return {
    error: {
      code: typeof record.code === "number" ? record.code : -32603,
      message: typeof record.message === "string" ? record.message : String(error),
      data: record.data,
    },
  };
}

function parseChainId(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return isHex(value) ? Number(hexToBigInt(value)) : Number(value);
  throw new WalletRpcError(-32602, "Invalid chainId");
}

export class TestWallet {
  readonly requests: WalletRequest[] = [];
  private account: LocalAccount;
  private chainId: number;
  private connected = false;
  private allowSend: boolean;
  private capabilities: "none" | "atomic";
  private readonly rpc: string;
  readonly identity: WalletIdentity;
  private readonly contexts = new Set<BrowserContext>();
  private readonly rejections: Record<PromptKind, number> = {
    connection: 0,
    signature: 0,
    transaction: 0,
    chainSwitch: 0,
  };
  private readonly holds: Hold[] = [];
  private readonly silences = new Set<Silence>();
  private readonly supportedChains = new Set<number>([sepolia.id, mainnet.id]);
  private readonly callBundles = new Map<string, Hex[]>();
  private delayMs = 0;
  private nextRpcId = 1;
  private nextBundleId = 1;

  constructor(options: TestWalletOptions) {
    this.account = options.account;
    this.chainId = options.chainId ?? sepolia.id;
    this.allowSend = options.allowSendTransaction ?? true;
    this.capabilities = options.capabilities ?? "none";
    this.rpc = options.rpcUrl;
    this.identity = options.identity ?? "metamask";
  }

  /** data-testid of this wallet's entry in RainbowKit's picker. */
  get pickerTestId(): string {
    return WALLET_IDENTITIES[this.identity].pickerTestId;
  }

  /** The wallet's own address (the "owner"), not the Society address shown in the app. */
  get address(): Address {
    return this.account.address;
  }

  get reportedChainId() {
    return this.chainId;
  }

  get isConnected() {
    return this.connected;
  }

  /** Adds the provider to every page of the context. Call before the first goto. */
  async install(context: BrowserContext) {
    if (this.contexts.has(context)) return;
    this.contexts.add(context);
    await context.exposeBinding("__e2eWalletRequest", (_source, request) =>
      this.handle(request as { method: string; params?: unknown }),
    );
    const { uuid, name, icon, rdns, isMetaMask } = WALLET_IDENTITIES[this.identity];
    await context.addInitScript(injectedProvider, { uuid, name, icon, rdns, isMetaMask });
  }

  // ---- what the "user" does in the wallet -------------------------------

  /** Switches the active account. A connected page is told (accountsChanged). */
  async setAccount(account: LocalAccount) {
    this.account = account;
    if (this.connected) await this.emit("accountsChanged", [account.address]);
  }

  /** Switches the wallet's network, e.g. 1 for the wrong-network cases (chainChanged). */
  async setChainId(chainId: number) {
    this.chainId = chainId;
    await this.emit("chainChanged", numberToHex(chainId));
  }

  /** The user disconnects the site in the wallet: accountsChanged with no accounts. */
  async disconnect() {
    this.connected = false;
    await this.emit("accountsChanged", []);
  }

  /** EIP-1193 "disconnect": the provider lost its connection to the chain. */
  async emitProviderDisconnect() {
    await this.emit("disconnect", { code: 4900, message: "The provider is disconnected from all chains." });
  }

  /** EIP-1193 "connect": the provider can reach the chain (again). */
  async emitProviderConnect() {
    await this.emit("connect", { chainId: numberToHex(this.chainId) });
  }

  /** The next `count` signature requests fail with 4001 (user rejected). */
  rejectNextSignature(count = 1) {
    this.rejections.signature = count;
  }

  /** The next `count` eth_sendTransaction / wallet_sendCalls requests fail with 4001. */
  rejectNextTransaction(count = 1) {
    this.rejections.transaction = count;
  }

  /** The next `count` connection requests (eth_requestAccounts) fail with 4001. */
  rejectNextConnection(count = 1) {
    this.rejections.connection = count;
  }

  /** The next `count` wallet_switchEthereumChain requests fail with 4001. */
  rejectNextChainSwitch(count = 1) {
    this.rejections.chainSwitch = count;
  }

  /**
   * Holds the next prompt of this kind open, like a person looking at the
   * wallet popup, until the test approves or rejects it. Use it to assert on
   * what the app shows while it waits, instead of sleeping:
   *
   *   const prompt = wallet.holdNext("signature");
   *   await submit();
   *   await prompt.requested;
   *   await expect(page.getByText("Signing transaction...")).toBeVisible();
   *   prompt.approve();
   */
  holdNext(kind: PromptKind): HeldPrompt {
    let announce!: () => void;
    let decide!: (decision: "approve" | "reject") => void;
    const requested = new Promise<void>((resolve) => (announce = resolve));
    const decision = new Promise<"approve" | "reject">((resolve) => (decide = resolve));
    this.holds.push({ kind, announce, decision });
    return { requested, approve: () => decide("approve"), reject: () => decide("reject") };
  }

  /**
   * Leaves every request of `method` unanswered until release(), like a
   * wallet extension that has hung: the page's promise neither resolves nor
   * rejects. Unlike holdNext this is not a prompt the user is looking at,
   * and it catches every request of the method, also ones the page makes
   * without asking the user (eth_accounts while wagmi restores a session).
   * The fixture releases what is left after the test.
   *
   *   const hung = wallet.stopAnswering("eth_accounts");
   */
  stopAnswering(method: string): UnansweredMethod {
    let resolveReleased!: () => void;
    const silence: Silence = {
      method,
      hits: 0,
      released: new Promise<void>((resolve) => (resolveReleased = resolve)),
      release: () => {
        this.silences.delete(silence);
        resolveReleased();
      },
    };
    this.silences.add(silence);
    return { hits: () => silence.hits, release: silence.release };
  }

  /** Releases every stopAnswering() that is still active. */
  releaseUnanswered() {
    for (const silence of [...this.silences]) silence.release();
  }

  /** Every prompt waits this long before the wallet answers. 0 switches it off. */
  setResponseDelay(milliseconds: number) {
    this.delayMs = milliseconds;
  }

  setAllowSendTransaction(allow: boolean) {
    this.allowSend = allow;
  }

  /** "atomic": answer EIP-5792 like a batching wallet. "none": 4200, like a plain EOA wallet. */
  setCapabilities(capabilities: "none" | "atomic") {
    this.capabilities = capabilities;
  }

  /** Chains wallet_switchEthereumChain accepts; others answer 4902. Default: Sepolia and mainnet. */
  setSupportedChains(chainIds: number[]) {
    this.supportedChains.clear();
    for (const id of chainIds) this.supportedChains.add(id);
  }

  // ---- the request log --------------------------------------------------

  clearRequests() {
    this.requests.length = 0;
  }

  methods(): string[] {
    return this.requests.map((request) => request.method);
  }

  requestsOf(...methods: string[]): WalletRequest[] {
    return this.requests.filter((request) => methods.includes(request.method));
  }

  /** personal_sign, eth_sign and eth_signTypedData*: nothing that costs gas. */
  signatureRequests(): WalletRequest[] {
    return this.requests.filter((request) => SIGNATURE_METHODS.has(request.method));
  }

  /** eth_sendTransaction requests, whatever their outcome. */
  sendTransactionRequests(): WalletRequest[] {
    return this.requestsOf("eth_sendTransaction");
  }

  /** wallet_sendCalls requests (EIP-5792), whatever their outcome. */
  sendCallsRequests(): WalletRequest[] {
    return this.requestsOf("wallet_sendCalls");
  }

  /** The log without params, for attaching to a report. */
  summary() {
    return this.requests.map(({ method, outcome, at, error, hash }) => ({ method, outcome, at, error, hash }));
  }

  // ---- internals ----------------------------------------------------------

  private pages(): Page[] {
    return Array.from(this.contexts).flatMap((context) => context.pages());
  }

  private async emit(event: string, data: unknown) {
    await Promise.all(
      this.pages().map((page) =>
        page
          .evaluate(
            ([name, payload]) => {
              const wallet = (
                window as unknown as {
                  __e2eWallet?: { emit: (event: string, data: unknown) => void };
                }
              ).__e2eWallet;
              wallet?.emit(name as string, payload);
            },
            [event, data] as const,
          )
          .catch(() => undefined),
      ),
    );
  }

  private async handle(request: { method: string; params?: unknown }): Promise<BridgeResult> {
    const { method, params } = request;
    // Recorded before it runs, so a test sees the request as soon as its effect.
    // Params of signing calls are messages, never keys.
    const entry: WalletRequest = { method, params, at: Date.now(), outcome: "ok" };
    this.requests.push(entry);
    const silence = [...this.silences].find((candidate) => candidate.method === method);
    if (silence) {
      silence.hits += 1;
      await silence.released;
    }
    try {
      const result = await this.dispatch(method, params);
      if (method === "eth_sendTransaction" && typeof result === "string" && isHex(result)) entry.hash = result;
      return { result };
    } catch (error) {
      const result = errorResult(error);
      const refused =
        error instanceof WalletRpcError && error.code === -32603 && /disabled for this test/.test(error.message);
      entry.outcome = result.error?.code === USER_REJECTED ? "rejected" : refused ? "refused" : "error";
      entry.error = result.error && { code: result.error.code, message: result.error.message };
      return result;
    }
  }

  /** One user prompt: an optional delay, a hold if the test set one, then a queued rejection. */
  private async prompt(kind: PromptKind) {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    const index = this.holds.findIndex((hold) => hold.kind === kind);
    if (index >= 0) {
      const [hold] = this.holds.splice(index, 1);
      hold.announce();
      if ((await hold.decision) === "reject") {
        throw new WalletRpcError(USER_REJECTED, "User rejected the request.");
      }
      return;
    }
    if (this.rejections[kind] > 0) {
      this.rejections[kind] -= 1;
      throw new WalletRpcError(USER_REJECTED, "User rejected the request.");
    }
  }

  private assertOwnAddress(address: unknown) {
    if (typeof address !== "string" || address.toLowerCase() !== this.address.toLowerCase()) {
      throw new WalletRpcError(4100, `The test wallet does not hold ${String(address)}`);
    }
  }

  private async dispatch(method: string, params: unknown): Promise<unknown> {
    const list = Array.isArray(params) ? params : [];
    switch (method) {
      case "eth_requestAccounts": {
        if (!this.connected) await this.prompt("connection");
        const first = !this.connected;
        this.connected = true;
        if (first) void this.emitProviderConnect();
        return [this.address];
      }
      case "eth_accounts":
        return this.connected ? [this.address] : [];
      case "eth_chainId":
        return numberToHex(this.chainId);
      case "net_version":
        return String(this.chainId);
      case "wallet_requestPermissions":
        if (!this.connected) await this.prompt("connection");
        this.connected = true;
        return [{ parentCapability: "eth_accounts", caveats: [] }];
      case "wallet_getPermissions":
        return this.connected ? [{ parentCapability: "eth_accounts", caveats: [] }] : [];
      case "wallet_revokePermissions":
        this.connected = false;
        return null;
      case "wallet_switchEthereumChain": {
        const target = parseChainId((list[0] as { chainId?: unknown } | undefined)?.chainId);
        if (!this.supportedChains.has(target)) {
          throw new WalletRpcError(4902, `Unrecognized chain ID ${target}`);
        }
        await this.prompt("chainSwitch");
        if (target !== this.chainId) {
          this.chainId = target;
          await this.emit("chainChanged", numberToHex(target));
        }
        return null;
      }
      case "wallet_addEthereumChain":
        return null;
      case "wallet_watchAsset":
        return true;
      case "personal_sign": {
        const [message, address] = list as [unknown, unknown];
        this.assertOwnAddress(address);
        await this.prompt("signature");
        if (typeof message !== "string") throw new WalletRpcError(-32602, "Invalid message");
        return this.account.signMessage({
          message: isHex(message) ? { raw: message } : message,
        });
      }
      case "eth_sign": {
        const [address, message] = list as [unknown, unknown];
        this.assertOwnAddress(address);
        await this.prompt("signature");
        if (typeof message !== "string" || !isHex(message)) {
          throw new WalletRpcError(-32602, "Invalid message");
        }
        return this.account.signMessage({ message: { raw: message } });
      }
      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        const [address, payload] = list as [unknown, unknown];
        this.assertOwnAddress(address);
        await this.prompt("signature");
        const typed = (typeof payload === "string" ? JSON.parse(payload) : payload) as {
          domain?: Record<string, unknown>;
          types: Record<string, unknown>;
          primaryType: string;
          message: Record<string, unknown>;
        };
        const types = { ...typed.types };
        delete types.EIP712Domain;
        return this.account.signTypedData({
          domain: typed.domain ?? {},
          types,
          primaryType: typed.primaryType,
          message: typed.message,
        } as unknown as TypedDataDefinition);
      }
      case "eth_sendTransaction": {
        const tx = list[0] as Record<string, unknown> | undefined;
        this.assertCanSend(method);
        if (!tx) throw new WalletRpcError(-32602, "Missing transaction");
        this.assertOwnAddress(tx.from ?? this.address);
        await this.prompt("transaction");
        return this.sendTransaction(tx);
      }
      default:
        if (EIP5792_METHODS.has(method)) return this.dispatchEip5792(method, list);
        if (UNSUPPORTED_METHODS.has(method)) {
          throw new WalletRpcError(4200, `The test wallet does not support ${method}`);
        }
        return this.forward(method, list);
    }
  }

  private assertCanSend(method: string) {
    if (!this.allowSend) {
      throw new WalletRpcError(-32603, `E2E test wallet: ${method} is disabled for this test`);
    }
    if (this.chainId !== sepolia.id) {
      throw new WalletRpcError(-32603, "E2E test wallet only sends on Sepolia");
    }
  }

  private async sendTransaction(tx: Record<string, unknown>): Promise<Hex> {
    const client = createWalletClient({
      account: this.account,
      chain: sepolia,
      transport: http(this.rpc),
    });
    const hex = (value: unknown) =>
      typeof value === "string" && isHex(value) ? hexToBigInt(value) : undefined;
    return client.sendTransaction({
      to: tx.to as Address | undefined,
      data: tx.data as Hex | undefined,
      value: hex(tx.value),
      gas: hex(tx.gas),
      maxFeePerGas: hex(tx.maxFeePerGas),
      maxPriorityFeePerGas: hex(tx.maxPriorityFeePerGas),
      nonce: tx.nonce !== undefined ? Number(hex(tx.nonce)) : undefined,
    } as Parameters<typeof client.sendTransaction>[0]);
  }

  /**
   * EIP-5792, enough to drive the app's wallet_sendCalls branch. The calls
   * are sent as ordinary transactions one after another, so this is NOT a
   * real atomic batch: MetaMask's own batching and 7702 upgrade belong to
   * the `extension` layer.
   */
  private async dispatchEip5792(method: string, list: unknown[]): Promise<unknown> {
    if (this.capabilities !== "atomic") {
      throw new WalletRpcError(4200, `The test wallet does not support ${method}`);
    }
    switch (method) {
      case "wallet_getCapabilities":
        return { [numberToHex(sepolia.id)]: { atomic: { status: "supported" } } };
      case "wallet_sendCalls": {
        const request = list[0] as
          | { from?: unknown; calls?: { to?: Address; data?: Hex; value?: Hex }[] }
          | undefined;
        this.assertCanSend(method);
        if (!request?.calls?.length) throw new WalletRpcError(-32602, "Missing calls");
        if (request.from !== undefined) this.assertOwnAddress(request.from);
        await this.prompt("transaction");
        const hashes: Hex[] = [];
        for (const call of request.calls) {
          hashes.push(await this.sendTransaction({ to: call.to, data: call.data, value: call.value }));
        }
        const id = numberToHex(this.nextBundleId++, { size: 32 });
        this.callBundles.set(id, hashes);
        return { id };
      }
      case "wallet_getCallsStatus": {
        const id = String(list[0]);
        const hashes = this.callBundles.get(id);
        if (!hashes) throw new WalletRpcError(5730, `Unknown bundle id ${id}`);
        const receipts = (await Promise.all(
          hashes.map((hash) => this.forward("eth_getTransactionReceipt", [hash])),
        )) as (Record<string, unknown> | null)[];
        const done = receipts.every(Boolean);
        const failed = receipts.some((receipt) => receipt?.status === "0x0");
        return {
          version: "2.0.0",
          id,
          chainId: numberToHex(sepolia.id),
          atomic: false,
          status: !done ? 100 : failed ? 500 : 200,
          receipts: done
            ? receipts.map((receipt) => ({
                logs: receipt!.logs,
                status: receipt!.status,
                blockHash: receipt!.blockHash,
                blockNumber: receipt!.blockNumber,
                gasUsed: receipt!.gasUsed,
                transactionHash: receipt!.transactionHash,
              }))
            : undefined,
        };
      }
      default:
        return null; // wallet_showCallsStatus
    }
  }

  private async forward(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(this.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: this.nextRpcId++, method, params }),
    });
    if (!response.ok) {
      throw new WalletRpcError(-32603, `RPC ${method} failed with HTTP ${response.status}`);
    }
    const body = (await response.json()) as { result?: unknown; error?: RpcError };
    if (body.error) throw new WalletRpcError(body.error.code ?? -32603, body.error.message);
    return body.result;
  }
}

/** For debugging output: decodes a personal_sign payload when it is text. */
export function describeSignature(request: WalletRequest): string {
  if (request.method !== "personal_sign" || !Array.isArray(request.params)) return request.method;
  const message = request.params[0];
  if (typeof message !== "string" || !isHex(message)) return request.method;
  if (message.length === 66) return "personal_sign (32-byte hash)";
  try {
    return `personal_sign: ${hexToString(message).split("\n")[0]}`;
  } catch {
    return request.method;
  }
}
