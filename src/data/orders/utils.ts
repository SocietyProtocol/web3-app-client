import { Hex } from "viem";
import { execute, OrdersDocument, OrdersQuery } from "../../../.graphclient";

/**
 * Fetch bidding orders for a given user
 *
 * @param auctionId - The ID of the auction
 * @param user - The hex address of the user
 * @returns A promise that resolves to the OrdersQuery data
 */
export const fetchOrders = async (auctionId: number, user: Hex) => {
  const res = await execute(OrdersDocument, {
    auctionId,
    user: user.toLowerCase(),
  });

  return res.data as OrdersQuery;
};
