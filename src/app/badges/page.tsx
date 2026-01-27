import { Badges } from "@/components/Badges/Badges";
import { BadgesHeader } from "@/components/Badges/BadgesHeader";
import { defaultOptions } from "@/data/badges/consts";
import { fetchBadges } from "@/data/badges/utils";
import { getQueryClient } from "@/lib/tanstack-query";
import { Box, Typography } from "@mui/material";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

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
      <Box>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          color="primary.main"
        >
          Badges
        </Typography>
        <Box>
          <BadgesHeader />
          <Suspense>
            <Badges />
          </Suspense>
        </Box>
      </Box>
    </HydrationBoundary>
  );
}
