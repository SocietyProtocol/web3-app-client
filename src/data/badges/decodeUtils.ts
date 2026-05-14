import { decodeEventLog, Hex, TransactionReceipt, zeroAddress } from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";

/**
 * Decodes the BadgeCreated event from a transaction receipt.
 */
export const decodeBadgeCreatedEvents = (receipt: TransactionReceipt) => {
  const createdBadges: Array<{
    id: bigint;
    name: string;
    isOfficial: boolean;
    isCommunityBadge: boolean;
    creator: Hex;
  }> = [];

  for (const log of receipt.logs) {
    try {
      const { args } = decodeEventLog({
        abi: SocietyProtocolBadgesABI,
        data: log.data,
        topics: log.topics,
        eventName: "BadgeCreated",
      });

      createdBadges.push(args);
    } catch {
      // not a BadgeCreated log
    }
  }
  return createdBadges;
};

/**
 * Decodes the BadgeModified event from a transaction receipt.
 */
export const decodeBadgeModified = (receipt: TransactionReceipt) => {
  for (const log of receipt.logs) {
    try {
      const { args } = decodeEventLog({
        abi: SocietyProtocolBadgesABI,
        data: log.data,
        topics: log.topics,
        eventName: "BadgeModified",
      });
      return args;
    } catch {
      // not a BadgeModified log
    }
  }
  return null;
};

/**
 * Decodes all TransferSingle events from a transaction receipt.
 */
export const decodeTransferSingles = (receipt: TransactionReceipt) => {
  const transfers: Array<{
    operator: `0x${string}`;
    from: `0x${string}`;
    to: `0x${string}`;
    id: bigint;
    value: bigint;
  }> = [];

  for (const log of receipt.logs) {
    try {
      const { args } = decodeEventLog({
        abi: SocietyProtocolBadgesABI,
        data: log.data,
        topics: log.topics,
        eventName: "TransferSingle",
      });
      transfers.push(args);
    } catch {
      // not a TransferSingle log
    }
  }

  return transfers;
};

/**
 * Decodes the BadgePermissions event from a transaction receipt.
 */
export const decodeBadgePermissions = (receipt: TransactionReceipt) => {
  for (const log of receipt.logs) {
    try {
      const { args } = decodeEventLog({
        abi: SocietyProtocolBadgesABI,
        data: log.data,
        topics: log.topics,
        eventName: "BadgePermissions",
      });
      return args;
    } catch {
      // not a BadgePermissions log
    }
  }
  return null;
};

/**
 * Decodes all EditorsUpdated events from a transaction receipt.
 */
export const decodeEditorsUpdated = (receipt: TransactionReceipt) => {
  const updates: Array<{
    id: bigint;
    editor: `0x${string}`;
    isAllowed: boolean;
  }> = [];

  for (const log of receipt.logs) {
    try {
      const { args } = decodeEventLog({
        abi: SocietyProtocolBadgesABI,
        data: log.data,
        topics: log.topics,
        eventName: "EditorsUpdated",
      });
      updates.push(args);
    } catch {
      // not an EditorsUpdated log
    }
  }

  return updates;
};

export const decodeBurnTransfer = (receipt: TransactionReceipt) =>
  decodeTransferSingles(receipt).find((t) => t.to === zeroAddress) ?? null;

/**
 * Finds all mint transfers (from === zeroAddress) in a receipt.
 */
export const decodeMintTransfers = (receipt: TransactionReceipt) =>
  decodeTransferSingles(receipt).filter((t) => t.from === zeroAddress);

/**
 * Finds the badge transfer (from and to are non-zero) in a receipt.
 */
export const decodeBadgeTransfer = (receipt: TransactionReceipt) =>
  decodeTransferSingles(receipt).find(
    (t) => t.from !== zeroAddress && t.to !== zeroAddress,
  ) ?? null;
