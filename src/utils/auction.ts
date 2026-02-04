import { Hex } from "viem";

/**
 * Encodes an order ID for the EasyAuction contract.
 * Order ID format: userId (64 bits) | buyAmount (96 bits) | sellAmount (96 bits)
 *
 * @param userId - User ID from easyAuction.getUserId(userAddress)
 * @param buyAmount - Buy amount (minBuyAmount) used in the bid
 * @param sellAmount - Sell amount used in the bid
 * @returns Encoded order ID as hex string
 */
export const encodeOrderId = (
  userId: bigint,
  buyAmount: bigint,
  sellAmount: bigint,
): Hex => {
  const userIdHex = userId.toString(16).padStart(16, "0");
  const buyAmountHex = buyAmount.toString(16).padStart(24, "0");
  const sellAmountHex = sellAmount.toString(16).padStart(24, "0");
  return `0x${userIdHex}${buyAmountHex}${sellAmountHex}` as Hex;
};

/**
 * Converts a subgraph order ID to the contract hex order ID.
 * Subgraph order ID format: "auctionId-sellAmount-buyAmount-userId"
 *
 * @param subgraphOrderId - The subgraph order ID string
 * @returns Object containing hexOrderId and auctionId
 * @throws Error if the subgraphOrderId format is invalid
 *
 **/
export const subgraphOrderIdToHex = (subgraphOrderId: string) => {
  const regex = /^\d+-\d+-\d+-\d+$/;

  if (!regex.test(subgraphOrderId)) {
    throw new Error(
      `Invalid subgraphOrderId "${subgraphOrderId}": expected format "auctionId-sellAmount-buyAmount-userId".`,
    );
  }

  const [auctionId, sellAmount, buyAmount, userId] = subgraphOrderId
    .split("-")
    .map((part) => BigInt(part));

  return {
    hexOrderId: encodeOrderId(userId, buyAmount, sellAmount),
    auctionId,
  };
};
