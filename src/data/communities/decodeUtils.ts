import { decodeEventLog, TransactionReceipt } from "viem";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";

/**
 * Decodes the created community ID from a transaction receipt.
 *
 * @param receipt Transaction receipt
 * @returns Created community ID or null if not found
 */
export const decodeCommunityId = (receipt: TransactionReceipt) => {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: CommunityRegistryAbi,
        data: log.data,
        topics: log.topics,
        eventName: "CommunityCreated",
      });

      return decoded.args.communityId;
    } catch {
      // Ignore logs that are not CommunityCreated events
    }
  }

  return null;
};
