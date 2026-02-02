import { AuctionProvider } from "@/components/Auction/AuctionContext";
import { AuctionDetails } from "@/components/Auction/AuctionDetails";
import { AuctionDetailsSkeleton } from "@/components/Auction/AuctionDetailsSkeleton";
import { fetchAuctionStatus } from "@/data/auction/utils";
import { getQueryClient } from "@/lib/tanstack-query";
import { Suspense } from "react";

const auctionId = process.env.NEXT_PUBLIC_AUCTION_ID
  ? parseInt(process.env.NEXT_PUBLIC_AUCTION_ID)
  : undefined;

export default async function AuctionPage() {
  if (auctionId !== undefined) {
    const queryClient = getQueryClient();

    try {
      await queryClient.prefetchQuery({
        queryKey: ["auctionStatus", auctionId],
        queryFn: () =>
          auctionId !== undefined ? fetchAuctionStatus(auctionId) : null,
      });
    } catch (error) {
      console.error("Error prefetching auction status:", error);
    }
  }

  return (
    <Suspense fallback={<AuctionDetailsSkeleton />}>
      <AuctionProvider auctionId={auctionId}>
        <AuctionDetails />
      </AuctionProvider>
    </Suspense>
  );
}
