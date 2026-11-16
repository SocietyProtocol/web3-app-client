import { Address, Hex, PublicClient, formatEther } from "viem";
import {
  AccountCall,
  LIGHT_ACCOUNT_FACTORY,
  encodeCreateAccount,
  encodeExecute,
  encodeExecuteBatch,
  lightAccountAddress,
} from "@/lib/smart-account";

/**
 * "Owner pays through the account": the connected wallet sends a normal
 * transaction to its Light Account's execute, so the Outpost contracts still
 * see the Light Account as msg.sender while the wallet pays the gas. The
 * Light Account never holds or needs ETH.
 */
export type OwnerTransaction = { to: Address; data: Hex };

export function hasCode(code: Hex | undefined | null): boolean {
  return !!code && code !== "0x";
}

/** createAccount(owner, 0) on the Light Account factory. */
export function accountDeployTransaction(owner: Address): OwnerTransaction {
  return { to: LIGHT_ACCOUNT_FACTORY, data: encodeCreateAccount(owner) };
}

/** execute for one call, executeBatch for several. Calls may not move ETH. */
export function accountExecuteTransaction(
  smartAccount: Address,
  calls: readonly AccountCall[],
): OwnerTransaction {
  if (calls.length === 0) throw new Error("Nothing to send");
  if (calls.some((call) => call.value !== BigInt(0))) {
    throw new Error("Calls through your Society account cannot transfer ETH");
  }
  const [first] = calls;
  return {
    to: smartAccount,
    data: calls.length === 1 && first ? encodeExecute(first) : encodeExecuteBatch(calls),
  };
}

export type OwnerPaysStep = "deploy" | "execute";

export type OwnerPaysWallet = {
  /** A regular transaction from the owner wallet. gas is the limit to use, when given. */
  sendTransaction(transaction: OwnerTransaction & { gas?: bigint }): Promise<Hex>;
  waitForReceipt(hash: Hex): Promise<{ status: "success" | "reverted"; blockNumber: bigint }>;
  /** Code at address, as of blockNumber when given. */
  getCode(address: Address, blockNumber?: bigint): Promise<Hex | undefined | null>;
  /** Gas for transaction sent by from, as of blockNumber when given. Rejects if it would revert. */
  estimateGas(
    transaction: OwnerTransaction,
    from: Address,
    blockNumber?: bigint,
  ): Promise<bigint>;
  wait?(ms: number): Promise<void>;
};

const AFTER_DEPLOY_ATTEMPTS = 5;
const AFTER_DEPLOY_RETRY_MS = 2_000;

/**
 * Sends the calls as the Light Account, paid by the owner wallet. Returns
 * the hash of the execute transaction.
 *
 * If the Light Account has no code yet, the owner first deploys it. A call
 * to an address without code succeeds and does nothing, and a node that has
 * not seen the deployment yet would price execute as exactly that, so after
 * the deployment the code and the gas are read at the deployment's block
 * (a lagging node fails instead of answering from older state) and execute
 * is sent with that gas limit rather than the wallet's own estimate.
 */
export async function sendOwnerPaysThroughAccount(
  wallet: OwnerPaysWallet,
  input: {
    owner: Address;
    calls: readonly AccountCall[];
    onStep?: (step: OwnerPaysStep, info: { steps: number }) => void;
  },
): Promise<Hex> {
  const smartAccount = lightAccountAddress(input.owner);
  const execute = accountExecuteTransaction(smartAccount, input.calls);

  if (hasCode(await wallet.getCode(smartAccount))) {
    input.onStep?.("execute", { steps: 1 });
    return wallet.sendTransaction(execute);
  }

  input.onStep?.("deploy", { steps: 2 });
  const deployHash = await wallet.sendTransaction(accountDeployTransaction(input.owner));
  const receipt = await wallet.waitForReceipt(deployHash);
  if (receipt.status !== "success") {
    throw new Error("Setting up your Society account failed. Please try again.");
  }

  const wait =
    wallet.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let gas: bigint | undefined;
  let lastError: unknown;
  for (let attempt = 1; attempt <= AFTER_DEPLOY_ATTEMPTS && gas === undefined; attempt += 1) {
    if (attempt > 1) await wait(AFTER_DEPLOY_RETRY_MS);
    try {
      if (!hasCode(await wallet.getCode(smartAccount, receipt.blockNumber))) continue;
      gas = await wallet.estimateGas(execute, input.owner, receipt.blockNumber);
    } catch (error) {
      lastError = error;
    }
  }
  if (gas === undefined) {
    throw (
      lastError ??
      new Error(
        "Your Society account was set up, but the network has not caught up yet. Please try again in a moment.",
      )
    );
  }

  input.onStep?.("execute", { steps: 2 });
  return wallet.sendTransaction({ ...execute, gas: withGasBuffer(gas) });
}

/** 20% over the estimate, as wallets add themselves. */
export function withGasBuffer(gas: bigint): bigint {
  return (gas * BigInt(12)) / BigInt(10);
}

/** Gas the execute wrapper adds on top of the inner calls, when it cannot be estimated directly. */
export const EXECUTE_OVERHEAD_GAS = BigInt(30_000);

export type OwnerPaysQuote = {
  /** False when the owner must first deploy the Light Account (two transactions). */
  deployed: boolean;
  gas: bigint;
  /** gas * current gas price: what the owner wallet is expected to pay. */
  costWei: bigint;
  /** Undefined when the balance could not be read. */
  ownerBalance?: bigint;
};

export type OwnerPaysClient = Pick<
  PublicClient,
  "getCode" | "estimateGas" | "getGasPrice" | "getBalance"
>;

/**
 * Prices the owner-pays route and proves the transaction would succeed.
 * Deployed account: estimates the real execute transaction from the owner
 * (reverts if the owner is not authorized or the inner call fails).
 * Undeployed: createAccount from the owner plus the inner calls as the Light
 * Account plus the execute wrapper.
 */
export async function quoteOwnerPays(
  client: OwnerPaysClient,
  input: { owner: Address; calls: readonly AccountCall[] },
): Promise<OwnerPaysQuote> {
  const smartAccount = lightAccountAddress(input.owner);
  const execute = accountExecuteTransaction(smartAccount, input.calls);
  const deployed = hasCode(await client.getCode({ address: smartAccount }));

  const gasParts = deployed
    ? [client.estimateGas({ account: input.owner, to: execute.to, data: execute.data })]
    : [
        client.estimateGas({
          account: input.owner,
          ...accountDeployTransaction(input.owner),
        }),
        ...input.calls.map((call) =>
          client.estimateGas({ account: smartAccount, to: call.to, data: call.data }),
        ),
      ];
  const [parts, gasPrice, balance] = await Promise.all([
    Promise.all(gasParts),
    client.getGasPrice(),
    client.getBalance({ address: input.owner }).catch(() => undefined),
  ]);
  const gas =
    parts.reduce((sum, part) => sum + part, BigInt(0)) +
    (deployed ? BigInt(0) : EXECUTE_OVERHEAD_GAS);

  return { deployed, gas, costWei: gas * gasPrice, ownerBalance: balance };
}

export function ownerCanPay(quote: Pick<OwnerPaysQuote, "costWei" | "ownerBalance">): boolean {
  return quote.ownerBalance === undefined || quote.ownerBalance >= quote.costWei;
}

/** Rounds up so the user never expects to pay less than shown. */
export function formatEthCeil(wei: bigint, decimals = 5): string {
  const step = BigInt(10) ** BigInt(18 - decimals);
  const rounded = ((wei + step - BigInt(1)) / step) * step;
  return formatEther(rounded);
}

export function walletNeedsEthMessage(owner: Address, costWei?: bigint) {
  const amount = costWei !== undefined ? `about ${formatEthCeil(costWei)} ETH` : "ETH";
  return `Your wallet ${owner} needs ${amount} to pay the network fee for this action`;
}

export function gasUnknownMessage() {
  return "Could not estimate the network fee for this action; please try again";
}

/** Shown before the wallet prompt when a sponsored action falls back to the owner wallet. */
export function freeGasUnavailableNotice(quote: Pick<OwnerPaysQuote, "costWei" | "deployed">) {
  const cost = `about ${formatEthCeil(quote.costWei)} ETH`;
  return quote.deployed
    ? `Free gas is unavailable right now, so your wallet will pay the network fee for this action (${cost}). Confirm it in your wallet.`
    : `Free gas is unavailable right now, so your wallet will pay the network fee for this action (${cost}). Confirm two transactions in your wallet: one sets up your Society account, the next sends the action.`;
}

export function freeGasUnavailableNoFundsMessage(owner: Address, costWei: bigint) {
  return `Free gas is unavailable right now and your wallet ${owner} does not have enough ETH to pay the network fee (about ${formatEthCeil(costWei)} ETH). Add ETH to your wallet or try again later.`;
}
