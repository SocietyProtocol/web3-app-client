import { Badges } from "@/components/Badges/Badges";
import { getQueryClient } from "@/lib/tanstack-query";
import { Box, Typography } from "@mui/material";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BadgesDocument, BadgesQuery, execute } from "../../../.graphclient";

const PAGE_SIZE = 1000;

const fetchBadges = async () => {
  const res = await execute(BadgesDocument, {
    first: PAGE_SIZE,
    skip: 0,
    orderBy: "id",
    orderDirection: "asc",
  });

  return res.data as BadgesQuery;
};

export default async function BadgesPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["badges", "id", "asc"],
      queryFn: fetchBadges,
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
          <Badges />
        </Box>
      </Box>
    </HydrationBoundary>
  );
}
