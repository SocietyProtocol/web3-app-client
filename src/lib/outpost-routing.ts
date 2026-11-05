import {
  Abi,
  Address,
  Hex,
  PublicClient,
  encodeFunctionData,
  formatEther,
} from "viem";
import {
  ENTRY_POINT_V07,
  encodeExecute,
  isSponsoredBadgesCall,
  userOperationMayRelay,
} from "@/lib/smart-account";

/**
 * Which account acts for a write.
 * - sponsored: the Light Account, Society pays gas.
 * - smart-account: the Light Account, paying gas from its own ETH.
 * - owner: the connected wallet, through writeContract / sendCalls.
 * - blocked: nothing can send it. message (or error) says why.
 */
export type OutpostRouteKind = "sponsored" | "smart-account" | "owner" | "blocked";

export type OutpostRoute = {
  kind: OutpostRouteKind;
  sender?: Address;
  sponsor: boolean;
  /** Upper bound the Light Account must hold (smart-account and blocked). */
  prefundWei?: bigint;
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

// Rough Light Account v2 limits on EntryPoint 0.7. The bundler sets the real
// ones; if these are short, it rejects with AA21 and the user sees that.
const VERIFICATION_GAS_DEPLOYED = BigInt(120_000);
const VERIFICATION_GAS_UNDEPLOYED = BigInt(400_000);
const PRE_VERIFICATION_GAS = BigInt(60_000);

export function estimateUserOperationPrefund(input: {
  callGas: bigint;
  deployed: boolean;
  maxFeePerGas: bigint;
}): bigint {
  const callGas = (input.callGas * BigInt(12)) / BigInt(10);
  const verification = input.deployed
    ? VERIFICATION_GAS_DEPLOYED
    : VERIFICATION_GAS_UNDEPLOYED;
  return (callGas + verification + PRE_VERIFICATION_GAS) * input.maxFeePerGas;
}

/** Rounds up so the user never sends too little. */
export function formatEthCeil(wei: bigint, decimals = 5): string {
  const step = BigInt(10) ** BigInt(18 - decimals);
  const rounded = ((wei + step - BigInt(1)) / step) * step;
  return formatEther(rounded);
}

export function insufficientFundsMessage(smartAccount: Address, neededWei?: bigint) {
  const amount = neededWei !== undefined ? `~${formatEthCeil(neededWei)} ETH` : "ETH";
  return `Your Society account ${smartAccount} needs ${amount} for this action; send ETH to it from your wallet or ask an admin`;
}

export function fundsUnknownMessage(smartAccount: Address) {
  return `Could not check the ETH balance of your Society account ${smartAccount}; please try again`;
}

/**
 * Picks the sender for one write.
 * Sponsored calls always go from the Light Account. Other Outpost calls go
 * from the Light Account whenever the call succeeds as it: if it cannot pay
 * (or its balance could not be read) the write is blocked rather than sent
 * from the wallet, so the action is never recorded under the wallet when it
 * could have been the Light Account's. The wallet sends only calls that fail
 * as the Light Account but succeed as the wallet (a role only it holds).
 */
export function chooseWriteSender(input: {
  owner?: Address;
  smartAccount?: Address;
  isContractWallet: boolean;
  relayable: boolean;
  sponsored: boolean;
  smartAccountSimulation?: SimulationOutcome;
  ownerSimulation?: SimulationOutcome;
  smartAccountFunds?: bigint;
  prefundWei?: bigint;
  /** Why smartAccountFunds or prefundWei is missing, when a read failed. */
  fundsReadError?: unknown;
}): OutpostRoute {
  const asOwner: OutpostRoute = { kind: "owner", sender: input.owner, sponsor: false };
  if (!input.owner || !input.smartAccount || input.isContractWallet) return asOwner;
  if (!input.relayable) return asOwner;
  if (input.sponsored) {
    return { kind: "sponsored", sender: input.smartAccount, sponsor: true };
  }

  const smartOk = input.smartAccountSimulation?.ok === true;
  const ownerOk = input.ownerSimulation?.ok === true;
  const prefundWei = input.prefundWei;
  const funded =
    prefundWei !== undefined &&
    input.smartAccountFunds !== undefined &&
    input.smartAccountFunds >= prefundWei;

  if (smartOk && funded) {
    return { kind: "smart-account", sender: input.smartAccount, sponsor: false, prefundWei };
  }
  if (smartOk && (prefundWei === undefined || input.smartAccountFunds === undefined)) {
    const message = fundsUnknownMessage(input.smartAccount);
    return {
      kind: "blocked",
      sender: input.smartAccount,
      sponsor: false,
      prefundWei,
      message,
      error: new Error(message, { cause: input.fundsReadError }),
    };
  }
  if (smartOk) {
    const shortfall =
      prefundWei !== undefined
        ? prefundWei - (input.smartAccountFunds ?? BigInt(0))
        : undefined;
    return {
      kind: "blocked",
      sender: input.smartAccount,
      sponsor: false,
      prefundWei,
      message: insufficientFundsMessage(
        input.smartAccount,
        shortfall !== undefined && shortfall > BigInt(0) ? shortfall : prefundWei,
      ),
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

const entryPointBalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type RoutingClient = Pick<
  PublicClient,
  | "simulateContract"
  | "estimateContractGas"
  | "estimateFeesPerGas"
  | "getBalance"
  | "getCode"
  | "readContract"
>;

function outcome(promise: PromiseSettledResult<unknown>): SimulationOutcome {
  return promise.status === "fulfilled"
    ? { ok: true }
    : { ok: false, error: promise.reason };
}

/**
 * Reads what chooseWriteSender needs. Only unsponsored Outpost calls from an
 * EOA owner touch the chain: simulate as both accounts, read the Light
 * Account's ETH and EntryPoint deposit, and price a UserOp.
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
  const smartAccount = input.smartAccount;
  const [smartSim, ownerSim, gas, balance, deposit, code, fees] =
    await Promise.allSettled([
      client.simulateContract({ ...call, account: smartAccount }),
      client.simulateContract({ ...call, account: input.owner }),
      client.estimateContractGas({ ...call, account: smartAccount }),
      client.getBalance({ address: smartAccount }),
      client.readContract({
        address: ENTRY_POINT_V07,
        abi: entryPointBalanceAbi,
        functionName: "balanceOf",
        args: [smartAccount],
      }),
      client.getCode({ address: smartAccount }),
      client.estimateFeesPerGas(),
    ]);

  const smartAccountFunds =
    balance.status === "fulfilled"
      ? balance.value + (deposit.status === "fulfilled" ? (deposit.value as bigint) : BigInt(0))
      : undefined;
  const prefundWei =
    gas.status === "fulfilled" && fees.status === "fulfilled"
      ? estimateUserOperationPrefund({
          callGas: gas.value,
          deployed: code.status === "fulfilled" && !!code.value && code.value !== "0x",
          maxFeePerGas: fees.value.maxFeePerGas ?? fees.value.gasPrice ?? BigInt(0),
        })
      : undefined;

  const fundsRead = [gas, fees, balance].find((read) => read.status === "rejected");

  return chooseWriteSender({
    ...base,
    smartAccountSimulation: outcome(smartSim),
    ownerSimulation: outcome(ownerSim),
    smartAccountFunds,
    prefundWei,
    fundsReadError: fundsRead?.status === "rejected" ? fundsRead.reason : undefined,
  });
}
