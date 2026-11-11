import { Abi, Address, Hex, PublicClient, encodeFunctionData } from "viem";
import {
  encodeExecute,
  isSponsoredBadgesCall,
  userOperationMayRelay,
} from "@/lib/smart-account";
import {
  OwnerPaysQuote,
  gasUnknownMessage,
  ownerCanPay,
  quoteOwnerPays,
  walletNeedsEthMessage,
} from "@/lib/owner-pays";

/**
 * Which account acts for a write, and who pays.
 * - sponsored: the Light Account acts, Society pays gas. If sponsorship is
 *   unavailable when the write is sent, it goes owner-through-account.
 * - owner-through-account: the Light Account acts, the connected wallet pays:
 *   a normal transaction from the wallet to the Light Account's execute.
 * - owner: the connected wallet acts and pays, through writeContract / sendCalls.
 * - blocked: nothing can send it. message (or error) says why.
 * The Light Account never pays: it holds no ETH and is never asked to.
 */
export type OutpostRouteKind =
  | "sponsored"
  | "owner-through-account"
  | "owner"
  | "blocked";

export type OutpostRoute = {
  kind: OutpostRouteKind;
  /** The account the contracts see as msg.sender. */
  sender?: Address;
  /** The wallet that pays gas. Undefined while Society sponsors. */
  payer?: Address;
  sponsor: boolean;
  /** What the owner wallet is expected to pay (owner-through-account and blocked). */
  gasWei?: bigint;
  /** The owner must first deploy the Light Account: two transactions. */
  deploysAccount?: boolean;
  message?: string;
  error?: unknown;
};

export type SimulationOutcome = { ok: true } | { ok: false; error: unknown };

/** EIP-7702 delegated EOAs still sign as EOAs. */
const DELEGATION_PREFIX = "0xef0100";

export function isContractWalletCode(code: Hex | undefined | null): boolean {
  if (!code || code === "0x") return false;
  return !code.toLowerCase().startsWith(DELEGATION_PREFIX);
}

/**
 * Connectors that are always contract wallets, even before deployment: a
 * counterfactual smart wallet has no code yet, would otherwise get a Light
 * Account, and would switch identity once deployed. Base Account (formerly
 * Coinbase Smart Wallet) is in RainbowKit's default list, as wagmi's
 * baseAccount connector or by its EIP-6963 rdns.
 */
const CONTRACT_WALLET_CONNECTORS = new Set(["safe", "baseAccount", "app.base.account"]);

/**
 * The Outpost identity for a connected wallet. EOAs act through their
 * Light Account; contract wallets (Safes, smart wallets) act as themselves.
 */
export function outpostIdentity(input: {
  owner?: Address;
  smartAccount?: Address;
  code?: Hex | null;
  codeLoading: boolean;
  connectorId?: string;
}): {
  address?: Address;
  isSmartAccount: boolean;
  isContractWallet: boolean;
  isLoading: boolean;
} {
  if (!input.owner) {
    return { address: undefined, isSmartAccount: false, isContractWallet: false, isLoading: false };
  }
  const isContractWallet =
    (!!input.connectorId && CONTRACT_WALLET_CONNECTORS.has(input.connectorId)) ||
    isContractWalletCode(input.code);
  if (isContractWallet) {
    return { address: input.owner, isSmartAccount: false, isContractWallet: true, isLoading: false };
  }
  // Hold the address back until we know which identity applies.
  if (input.codeLoading) {
    return { address: undefined, isSmartAccount: false, isContractWallet: false, isLoading: true };
  }
  return {
    address: input.smartAccount,
    isSmartAccount: !!input.smartAccount,
    isContractWallet: false,
    isLoading: false,
  };
}

/** Whether the Light Account may relay this call, and whether Society pays. */
export function callShape(input: {
  chainId: number;
  to: Address;
  data: Hex;
  value?: bigint;
}): { relayable: boolean; sponsored: boolean } {
  if (input.value !== undefined && input.value !== BigInt(0)) {
    return { relayable: false, sponsored: false };
  }
  try {
    const wrapped = encodeExecute({ to: input.to, value: BigInt(0), data: input.data });
    const relayable = userOperationMayRelay({ callData: wrapped }, input.chainId).ok;
    return {
      relayable,
      sponsored:
        relayable &&
        isSponsoredBadgesCall({ chainId: input.chainId, to: input.to, data: input.data }),
    };
  } catch {
    return { relayable: false, sponsored: false };
  }
}

/**
 * Picks the sender and the payer for one write.
 * Sponsored calls go from the Light Account with Society paying. Other
 * Outpost calls go from the Light Account whenever the call succeeds as it,
 * paid by the wallet through execute, so the action is never recorded under
 * the wallet when it could have been the Light Account's. The wallet sends
 * directly only calls that fail as the Light Account but succeed as the
 * wallet (a role only it holds).
 */
export function chooseWriteSender(input: {
  owner?: Address;
  smartAccount?: Address;
  isContractWallet: boolean;
  relayable: boolean;
  sponsored: boolean;
  smartAccountSimulation?: SimulationOutcome;
  ownerSimulation?: SimulationOutcome;
  /** Price of sending it from the wallet through the Light Account. */
  ownerPays?: OwnerPaysQuote;
  /** Why ownerPays is missing, when pricing it failed. */
  quoteError?: unknown;
}): OutpostRoute {
  const asOwner: OutpostRoute = {
    kind: "owner",
    sender: input.owner,
    payer: input.owner,
    sponsor: false,
  };
  if (!input.owner || !input.smartAccount || input.isContractWallet) return asOwner;
  if (!input.relayable) return asOwner;
  if (input.sponsored) {
    return { kind: "sponsored", sender: input.smartAccount, sponsor: true };
  }

  const smartOk = input.smartAccountSimulation?.ok === true;
  const ownerOk = input.ownerSimulation?.ok === true;
  const through = { sender: input.smartAccount, payer: input.owner, sponsor: false };

  if (smartOk && input.ownerPays) {
    const quote = input.ownerPays;
    const priced = { gasWei: quote.costWei, deploysAccount: !quote.deployed };
    if (!ownerCanPay(quote)) {
      return {
        kind: "blocked",
        ...through,
        ...priced,
        message: walletNeedsEthMessage(input.owner, quote.costWei),
      };
    }
    return { kind: "owner-through-account", ...through, ...priced };
  }
  if (smartOk) {
    const message = gasUnknownMessage();
    return {
      kind: "blocked",
      ...through,
      message,
      error: new Error(message, { cause: input.quoteError }),
    };
  }
  if (ownerOk) return asOwner;

  const failed = input.smartAccountSimulation ?? input.ownerSimulation;
  return {
    kind: "blocked",
    sender: input.smartAccount,
    sponsor: false,
    error: failed && !failed.ok ? failed.error : undefined,
    message: failed && !failed.ok ? undefined : "This action would fail",
  };
}

export type RoutingClient = Pick<
  PublicClient,
  "simulateContract" | "estimateGas" | "getGasPrice" | "getBalance" | "getCode"
>;

function outcome(promise: PromiseSettledResult<unknown>): SimulationOutcome {
  return promise.status === "fulfilled"
    ? { ok: true }
    : { ok: false, error: promise.reason };
}

/**
 * Reads what chooseWriteSender needs. Only unsponsored Outpost calls from an
 * EOA owner touch the chain: simulate as both accounts and price the
 * transaction the wallet would send through the Light Account.
 */
export async function resolveOutpostRoute(
  client: RoutingClient | undefined,
  input: {
    chainId: number;
    to: Address;
    abi: readonly unknown[] | Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
    owner?: Address;
    smartAccount?: Address;
    isContractWallet: boolean;
  },
): Promise<OutpostRoute> {
  let data: Hex;
  try {
    data = encodeFunctionData({
      abi: input.abi as Abi,
      functionName: input.functionName,
      args: input.args ?? [],
    });
  } catch {
    return chooseWriteSender({ ...input, relayable: false, sponsored: false });
  }
  const shape = callShape({ chainId: input.chainId, to: input.to, data, value: input.value });
  const base = { ...input, ...shape };
  if (
    !input.owner ||
    !input.smartAccount ||
    input.isContractWallet ||
    !shape.relayable ||
    shape.sponsored
  ) {
    return chooseWriteSender(base);
  }
  if (!client) throw new Error("Network is not available");

  const call = {
    address: input.to,
    abi: input.abi as Abi,
    functionName: input.functionName,
    args: input.args ?? [],
  };
  const [smartSim, ownerSim, quote] = await Promise.allSettled([
    client.simulateContract({ ...call, account: input.smartAccount }),
    client.simulateContract({ ...call, account: input.owner }),
    quoteOwnerPays(client, {
      owner: input.owner,
      calls: [{ to: input.to, value: BigInt(0), data }],
    }),
  ]);

  return chooseWriteSender({
    ...base,
    smartAccountSimulation: outcome(smartSim),
    ownerSimulation: outcome(ownerSim),
    ownerPays: quote.status === "fulfilled" ? quote.value : undefined,
    quoteError: quote.status === "rejected" ? quote.reason : undefined,
  });
}
