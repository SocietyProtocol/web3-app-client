import { parseEventLogs, TransactionReceipt, zeroAddress } from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";

/*
 * viem's decodeEventLog decodes a log as whichever ABI event its topic
 * matches and does not check `eventName` at runtime, so it cannot be used to
 * pick one kind of event out of a receipt. parseEventLogs does filter by name.
 */

/**
 * Decodes the BadgeCreated event from a transaction receipt.
 */
export const decodeBadgeCreatedEvents = (receipt: TransactionReceipt) =>
  parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    logs: receipt.logs,
    eventName: "BadgeCreated",
  }).map((log) => log.args);

/**
 * Decodes the BadgeModified event from a transaction receipt.
 */
export const decodeBadgeModified = (receipt: TransactionReceipt) =>
  parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    logs: receipt.logs,
    eventName: "BadgeModified",
  })[0]?.args ?? null;

/**
 * Decodes all TransferSingle events from a transaction receipt.
 */
export const decodeTransferSingles = (receipt: TransactionReceipt) =>
  parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    logs: receipt.logs,
    eventName: "TransferSingle",
  }).map((log) => log.args);

/**
 * Decodes the BadgePermissions event from a transaction receipt.
 */
export const decodeBadgePermissions = (receipt: TransactionReceipt) =>
  parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    logs: receipt.logs,
    eventName: "BadgePermissions",
  })[0]?.args ?? null;

/**
 * Decodes all EditorsUpdated events from a transaction receipt.
 */
export const decodeEditorsUpdated = (receipt: TransactionReceipt) =>
  parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    logs: receipt.logs,
    eventName: "EditorsUpdated",
  }).map((log) => log.args);

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
