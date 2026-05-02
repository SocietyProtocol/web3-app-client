"use client";

import { Box, Grid, Stack, Typography } from "@mui/material";
import { CommunityActivities } from "./Activity/CommunityActivities";
import { useCommunityDetailsContext } from "./CommunityDetails.context";

export function OverviewTab() {
  const { id, community } = useCommunityDetailsContext();

  return (
    <Stack spacing={4}>
      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, sm: "auto" }}>
          <Stack>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              {community?.memberCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Members
            </Typography>
          </Stack>
        </Grid>

        {community?.description && (
          <Grid size={{ xs: 12, sm: "grow" }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              About
            </Typography>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {community.description}
            </Typography>
          </Grid>
        )}
      </Grid>

      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Recent Activity
        </Typography>
        <CommunityActivities communityId={id} />
      </Box>
    </Stack>
  );
}
