"use client";

import { Box, Grid, Stack, Typography } from "@mui/material";
import { CommunityActivities } from "@/components/Communities/Activity/CommunityActivities";

interface OverviewTabProps {
  communityId: string;
  memberCount: number;
  description?: string | null;
}

export function OverviewTab({
  communityId,
  memberCount,
  description,
}: OverviewTabProps) {
  return (
    <Stack spacing={4}>
      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, sm: "auto" }}>
          <Stack>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              {memberCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Members
            </Typography>
          </Stack>
        </Grid>

        {description && (
          <Grid size={{ xs: 12, sm: "grow" }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              About
            </Typography>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {description}
            </Typography>
          </Grid>
        )}
      </Grid>

      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Recent Activity
        </Typography>
        <CommunityActivities communityId={communityId} />
      </Box>
    </Stack>
  );
}
