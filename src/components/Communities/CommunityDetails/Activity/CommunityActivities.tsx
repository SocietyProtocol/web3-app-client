"use client";

import { Button, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { useCommunityActivities } from "@/data/communities/useCommunityActivities";
import { CommunityActivityRow } from "./CommunityActivityRow";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";

interface CommunityActivitiesProps {
  communityId: string;
}

export function CommunityActivities({ communityId }: CommunityActivitiesProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCommunityActivities(communityId);

  if (isError) {
    return (
      <ErrorDisplay
        error={error}
        action={
          <Button onClick={() => refetch()} variant="contained">
            Retry
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <Stack>
        {Array.from({ length: 3 }).map((_, i) => (
          <Grid key={i} container spacing={2} sx={{ py: 1.5 }}>
            <Grid size={{ xs: 4, sm: 3 }}>
              <Skeleton width={80} height={20} />
            </Grid>
            <Grid size={{ xs: 8, sm: 9 }}>
              <Skeleton width="60%" height={20} />
            </Grid>
          </Grid>
        ))}
      </Stack>
    );
  }

  const events =
    data?.pages.flatMap((p) => p.communityActivityEvents ?? []) ?? [];

  if (events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recent activity.
      </Typography>
    );
  }

  return (
    <Stack alignItems="flex-start">
      {events.map((event) => (
        <CommunityActivityRow key={event.id} event={event} />
      ))}
      {hasNextPage && (
        <Button
          variant="text"
          size="small"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          sx={{
            mt: 1,
            "&&": {
              px: 0,
              py: 0,
            },
            "&:hover": {
              backgroundColor: "transparent",
              textDecoration: "underline",
            },
          }}
        >
          {isFetchingNextPage ? "Loading..." : "Load more activities"}
        </Button>
      )}
    </Stack>
  );
}
