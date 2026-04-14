import { AuctionProvider } from "@/components/Auction/AuctionContext";
import { AuctionDetails } from "@/components/Auction/AuctionDetails";
import { AuctionDetailsSkeleton } from "@/components/Auction/AuctionDetailsSkeleton";
import { BubbleBase } from "@/components/Bubbles/BubbleBase";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { Page } from "@/components/Page/Page";
import { fetchAuction } from "@/data/auction/utils";
import { env } from "@/lib/env";
import { getQueryClient } from "@/lib/tanstack-query";
import { Box, Stack, Typography } from "@mui/material";
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
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {env.auctionId !== undefined ? (
              <AuctionDetails />
            ) : (
              <Stack
                sx={{
                  mx: "auto",
                  mt: 8,
                  px: { xs: 2, md: 0 },
                }}
              >
                <Typography
                  variant="h4"
                  component="h1"
                  color="primary.main"
                  sx={{
                    fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
                  }}
                >
                  SPEC ICO Auction
                </Typography>
                <Stack
                  direction="row"
                  spacing={4}
                  alignItems="flex-start"
                  justifyContent="center"
                  sx={{
                    mx: "auto",
                    mt: 8,
                  }}
                >
                  <MarkdownRenderer
                    src="/api/copywriting/ico"
                    sx={{ maxWidth: 980, mx: "auto", px: { xs: 2, md: 0 } }}
                  />
                  <BubbleBase
                    sx={{ maxWidth: 400, margin: "40px auto" }}
                    actions={
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        Stay tuned for updates!
                      </Typography>
                    }
                  >
                    <Typography variant="h4" component="p">
                      Coming soon
                    </Typography>
                  </BubbleBase>
                </Stack>
              </Stack>
            )}
          </Box>
        </Page>
      </AuctionProvider>
    </Suspense>
  );
}
