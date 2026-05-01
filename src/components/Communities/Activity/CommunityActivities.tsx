"use client";

import { Grid, Link, Skeleton, Stack, Typography } from "@mui/material";
import { useCommunityActivities } from "@/data/communities/useCommunityActivities";
import { CommunityActivityRow } from "./CommunityActivityRow";

interface CommunityActivitiesProps {
  communityId: string;
}

export function CommunityActivities({ communityId }: CommunityActivitiesProps) {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useCommunityActivities(communityId);

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
        <Link
          component="button"
          variant="body2"
          onClick={() => fetchNextPage()}
          aria-disabled={isFetchingNextPage}
          sx={{
            mt: 1,
            opacity: isFetchingNextPage ? 0.5 : 1,
            pointerEvents: isFetchingNextPage ? "none" : "auto",
            textDecoration: "none",
          }}
        >
          {isFetchingNextPage ? "Loading…" : "Load more activities"}
        </Link>
      )}
    </Stack>
  );
}
