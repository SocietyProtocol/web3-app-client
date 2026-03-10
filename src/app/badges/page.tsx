import { Badges } from "@/components/Badges/Badges";
import { BadgesHeader } from "@/components/Badges/BadgesHeader";
import { Page } from "@/components/Page/Page";
import { defaultOptions } from "@/data/badges/consts";
import { fetchBadges } from "@/data/badges/utils";
import { getQueryClient } from "@/lib/tanstack-query";
import { Box } from "@mui/material";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

export const metadata = {
  title: "Badges",
  description: "Explore and manage badges on Society Protocol.",
};

export default async function BadgesPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["badges", defaultOptions],
      queryFn: () => fetchBadges(),
      initialPageParam: 0,
    });
  } catch (error) {
    console.error("Error prefetching badges:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page title="Badges">
        <Box>
          <BadgesHeader />
          <Suspense>
            <Badges />
          </Suspense>
        </Box>
      </Page>
    </HydrationBoundary>
  );
}
