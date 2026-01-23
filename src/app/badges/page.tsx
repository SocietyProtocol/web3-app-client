import { Badges } from "@/components/Badges/Badges";
import { defaultOptions } from "@/components/Badges/consts";
import { fetchBadges } from "@/components/Badges/utils";
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
        <Typography variant="h4" component="h1" gutterBottom>
          Badges
        </Typography>
        <Box>
          <Suspense>
            <Badges />
          </Suspense>
        </Box>
      </Box>
    </HydrationBoundary>
  );
}
