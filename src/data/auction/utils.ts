import { AuctionDocument, AuctionQuery, execute } from "../../../.graphclient";

/**
 * Fetches auction data for the given auction ID.
 *
 * @param auctionId Auction ID
 * @returns Auction data
 */
export const fetchAuction = async (auctionId: number) => {
  const res = await execute(AuctionDocument, {
    id: auctionId,
  });

  return res.data as AuctionQuery;
};
