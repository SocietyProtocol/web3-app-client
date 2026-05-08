import { decodeEventLog, TransactionReceipt } from "viem";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";

/**
 * Decodes the community details from a CommunityDetailsUpdated event in the receipt.
 */
export const decodeCommunityDetailsUpdated = (receipt: TransactionReceipt) => {
  for (const log of receipt.logs) {
    try {
      const { args } = decodeEventLog({
        abi: CommunityRegistryAbi,
        data: log.data,
        topics: log.topics,
        eventName: "CommunityDetailsUpdated",
      });
      return args;
    } catch {
      // not a CommunityDetailsUpdated log
    }
  }
  return null;
};

/**
 * Decodes the created community data from a CommunityCreated event in the receipt.
 *
 * @param receipt Transaction receipt
 * @returns Created community data or null if not found
 */
export const decodeCommunityCreated = (receipt: TransactionReceipt) => {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: CommunityRegistryAbi,
        data: log.data,
        topics: log.topics,
        eventName: "CommunityCreated",
      });

      return decoded.args;
    } catch {
      // Ignore logs that are not CommunityCreated events
    }
  }

  return null;
};
