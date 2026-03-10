import { AuctionProvider } from "@/components/Auction/AuctionContext";
import { AuctionDetails } from "@/components/Auction/AuctionDetails";
import { AuctionDetailsSkeleton } from "@/components/Auction/AuctionDetailsSkeleton";
import { Page } from "@/components/Page/Page";
import { fetchAuction } from "@/data/auction/utils";
import { env } from "@/lib/env";
import { getQueryClient } from "@/lib/tanstack-query";
import { Suspense } from "react";

export const metadata = {
  title: "SPEC Token Auction",
  description: "Participate in the Society Protocol IOC Auction.",
};

export default async function AuctionPage() {
  const queryClient = getQueryClient();

  try {
    if (env.auctionId !== undefined) {
      await queryClient.prefetchQuery({
        queryKey: ["auction", env.auctionId],
        queryFn: () =>
          env.auctionId
            ? fetchAuction(env.auctionId)
            : Promise.resolve(undefined),
      });
    } else {
      console.warn("Auction ID is not set. Skipping auction data prefetch.");
    }
  } catch (error) {
    console.error("Error prefetching auction:", error);
  }

  return (
    <Suspense fallback={<AuctionDetailsSkeleton />}>
      <AuctionProvider auctionId={env.auctionId}>
        <Page>
          <AuctionDetails />
        </Page>
      </AuctionProvider>
    </Suspense>
  );
}
