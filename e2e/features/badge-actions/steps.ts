import { encodeFunctionData, isAddressEqual, parseEventLogs, type Address, type Hex, type TransactionReceipt } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { encodeExecute } from "../../../src/lib/smart-account";
import { BADGES_ADDRESS } from "../../env/hermetic";

/**
 * Shared by the badge-actions specs. Not a spec: files here that do not end
 * in .spec.ts are not collected.
 */

export type BadgeMovement = {
  /** Who the badges contract saw make the call. */
  operator: Address;
  /** The zero address for a mint. */
  from: Address;
  /** The zero address for a burn. */
  to: Address;
  badgeId: bigint;
  amount: bigint;
};

/** Every unit of a badge that a transaction minted, burned or moved (TransferSingle), in order. */
export function badgeMovementsIn(receipt: TransactionReceipt): BadgeMovement[] {
  return parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    eventName: "TransferSingle",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
  }).map((log) => ({
    operator: log.args.operator,
    from: log.args.from,
    to: log.args.to,
    badgeId: log.args.id,
    amount: log.args.value,
  }));
}

/**
 * The data of the transaction the owner wallet sends to its Light Account
 * for one call of the badges contract: execute(badges, 0, call).
 */
export function throughAccount(call: Hex): Hex {
  return encodeExecute({ to: BADGES_ADDRESS, value: BigInt(0), data: call });
}

/** mintToMultiple(recipients, badgeId, 1, "0x"): the call the Mint tab makes, in Single and in Batch mode. */
export function mintCall(badgeId: bigint, recipients: Address[]): Hex {
  return encodeFunctionData({
    abi: SocietyProtocolBadgesABI,
    functionName: "mintToMultiple",
    args: [recipients, badgeId, BigInt(1), "0x"],
  });
}

/** burn(holder, badgeId, 1): the call the Burn tab makes. */
export function burnCall(badgeId: bigint, holder: Address): Hex {
  return encodeFunctionData({
    abi: SocietyProtocolBadgesABI,
    functionName: "burn",
    args: [holder, badgeId, BigInt(1)],
  });
}

/** safeTransferFrom(from, to, badgeId, 1, "0x"): the call the Transfer tab makes. */
export function transferCall(badgeId: bigint, from: Address, to: Address): Hex {
  return encodeFunctionData({
    abi: SocietyProtocolBadgesABI,
    functionName: "safeTransferFrom",
    args: [from, to, badgeId, BigInt(1), "0x"],
  });
}

/** "0x1234...abcdef": how the app shortens an address in its notices. */
export function shortened(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}
