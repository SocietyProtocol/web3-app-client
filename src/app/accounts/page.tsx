import { Accounts } from "@/components/Accounts/Accounts";
import { defaultOptions } from "@/data/users/consts";
import { fetchUsers } from "@/data/users/utils";
import { getQueryClient } from "@/lib/tanstack-query";
import { Box, Typography } from "@mui/material";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

export default async function AccountsPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["users", defaultOptions],
      queryFn: () => fetchUsers(),
      initialPageParam: 0,
    });
  } catch (error) {
    console.error("Error prefetching accounts:", error);
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
          Accounts
        </Typography>
        <Box>
          <Suspense>
            <Accounts />
          </Suspense>
        </Box>
      </Box>
    </HydrationBoundary>
  );
}
