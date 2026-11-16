import {
  encodeFunctionData,
  isAddressEqual,
  parseEventLogs,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { SocietyVipManagerABI } from "../../../src/abis/SocietyVipManager";
import { contracts } from "../../../src/consts/contracts";
import { tokens } from "../../../src/consts/tokens";
import type { Chain } from "../chain/chain";
import { approveAs, tokenBalance } from "./auction-tokens";
import { upsert, type OverlayOp } from "./entities";

/**
 * Lock SPEC on the local fork: the VIP manager's tier amounts, SPEC on a
 * wallet, a lock made earlier, time travel past its end, and the lock
 * history as the subgraph would report it.
 *
 * SPEC and a lock belong to the owner WALLET, not to the Society account:
 * the page reads `useAccount().address` for the balance, the lock and the
 * history, and the wallet itself sends approve, lock and unlock.
 */
export const VIP_MANAGER_ADDRESS: Address = contracts.vipManager.sepolia;
export const SPEC_TOKEN_ADDRESS: Address = tokens.spec.sepolia;
/** What the page assumes (src/components/LockSpec/consts.ts). */
export const SPEC_DECIMALS = 18;
export const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60);

export type LockParameters = {
  /** SPEC to lock for each tier, as the contract has them now. */
  bronze: bigint;
  silver: bigint;
  gold: bigint;
  /** The shortest lock the contract takes, in seconds. */
  minDuration: bigint;
};

export async function lockParameters(chain: Chain): Promise<LockParameters> {
  const vip = { address: VIP_MANAGER_ADDRESS, abi: SocietyVipManagerABI } as const;
  const [bronze, silver, gold, minDuration] = await Promise.all([
    chain.public.readContract({ ...vip, functionName: "bronzeAmount" }),
    chain.public.readContract({ ...vip, functionName: "silverAmount" }),
    chain.public.readContract({ ...vip, functionName: "goldAmount" }),
    chain.public.readContract({ ...vip, functionName: "MIN_LOCK_DURATION" }),
  ]);
  return { bronze, silver, gold, minDuration };
}

/** The wallet's SPEC. */
export function specBalance(chain: Chain, holder: Address): Promise<bigint> {
  return tokenBalance(chain, SPEC_TOKEN_ADDRESS, holder);
}

/** Makes the wallet hold exactly `amount` SPEC (written into the token's storage on the fork). */
export function giveSpec(chain: Chain, holder: Address, amount: bigint): Promise<void> {
  return chain.setErc20Balance(SPEC_TOKEN_ADDRESS, holder, amount);
}

/** The wallet's lock in the VIP manager: nothing locked is amount 0. */
export async function currentLock(chain: Chain, wallet: Address): Promise<{ amount: bigint; unlockTime: bigint }> {
  const [amount, unlockTime] = await chain.public.readContract({
    address: VIP_MANAGER_ADDRESS,
    abi: SocietyVipManagerABI,
    functionName: "locks",
    args: [wallet],
  });
  return { amount, unlockTime };
}

/** lock(amount, duration): the call "Approve and Lock" ends with. */
export function lockCall(amount: bigint, durationSeconds: bigint): Hex {
  return encodeFunctionData({ abi: SocietyVipManagerABI, functionName: "lock", args: [amount, durationSeconds] });
}

/** unlock(): the call "CLAIM ... SPEC" makes. */
export function unlockCall(): Hex {
  return encodeFunctionData({ abi: SocietyVipManagerABI, functionName: "unlock", args: [] });
}

/** The locks a transaction made in the VIP manager (its TokensLocked events). */
export function locksIn(receipt: TransactionReceipt): { user: Address; amount: bigint; unlockTime: bigint }[] {
  return parseEventLogs({
    abi: SocietyVipManagerABI,
    eventName: "TokensLocked",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, VIP_MANAGER_ADDRESS)),
  }).map((log) => ({ user: log.args.user, amount: log.args.amount, unlockTime: log.args.unlockTime }));
}

/** What a transaction gave back from the VIP manager (its TokensUnlocked events). */
export function unlocksIn(receipt: TransactionReceipt): { user: Address; amount: bigint }[] {
  return parseEventLogs({
    abi: SocietyVipManagerABI,
    eventName: "TokensUnlocked",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, VIP_MANAGER_ADDRESS)),
  }).map((log) => ({ user: log.args.user, amount: log.args.amount }));
}

export type SeededLock = {
  /** The lock transaction. */
  hash: Hex;
  amount: bigint;
  /** Block time of the lock. */
  lockedAt: bigint;
  unlockTime: bigint;
};

/**
 * A lock the wallet made earlier: gives it the SPEC on top of what it
 * holds, approves the VIP manager and locks, all as the wallet
 * (impersonated). The wallet's SPEC balance is afterwards what it was.
 */
export async function lockAs(
  chain: Chain,
  wallet: Address,
  input: { amount: bigint; durationSeconds: bigint },
): Promise<SeededLock> {
  const held = await specBalance(chain, wallet);
  await giveSpec(chain, wallet, held + input.amount);
  await approveAs(chain, SPEC_TOKEN_ADDRESS, wallet, VIP_MANAGER_ADDRESS, input.amount);
  const receipt = await chain.sendAs(wallet, {
    to: VIP_MANAGER_ADDRESS,
    data: lockCall(input.amount, input.durationSeconds),
  });
  const [locked] = locksIn(receipt);
  if (!locked) throw new Error("Seeding failed: lock() emitted no TokensLocked event");
  const { timestamp } = await chain.public.getBlock({ blockNumber: receipt.blockNumber });
  return { hash: receipt.transactionHash, amount: locked.amount, lockedAt: timestamp, unlockTime: locked.unlockTime };
}

/**
 * Moves the chain's clock past `timestamp` and mines a block there.
 *
 * THERE IS NO WAY BACK. The local chain is never reverted (see "No revert"
 * in e2e/README.md), so every block after this call, in this test and in
 * everything that runs on the same stack later, is that far in the future.
 * Returns the new block time.
 */
export async function travelPast(chain: Chain, timestamp: bigint): Promise<bigint> {
  const { timestamp: now } = await chain.public.getBlock();
  if (now <= timestamp) {
    await chain.anvil.increaseTime({ seconds: Number(timestamp - now) + 60 });
  }
  await chain.anvil.mine({ blocks: 1 });
  const { timestamp: after } = await chain.public.getBlock();
  if (after <= timestamp) throw new Error(`The chain is at ${after} after time travel; expected past ${timestamp}`);
  return after;
}

/**
 * One row of the lock history as the subgraph would index it. The fake does
 * not follow the VIP manager, so a test builds the row from a transaction
 * that happened (lockAs(), or the receipt of the page's own write). `id` is
 * the transaction's hash; `user` is the WALLET.
 */
export function lockTransaction(input: {
  id: Hex;
  user: Address;
  type: "lock" | "claim";
  amount: bigint;
  /** Null for a claim. */
  lockDate: bigint | null;
  unlockDate: bigint;
}): OverlayOp {
  return upsert("LockTransaction", input.id, {
    userAddress: input.user.toLowerCase(),
    user: null,
    type: input.type,
    amount: String(input.amount),
    lockDate: input.lockDate === null ? null : String(input.lockDate),
    unlockDate: String(input.unlockDate),
  });
}
