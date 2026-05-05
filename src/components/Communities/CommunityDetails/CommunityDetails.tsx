"use client";

import { Box, Chip, Stack, Tab, Tabs } from "@mui/material";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";
import { OverviewTab } from "./OverviewTab";
import { CommunityDetailHeader } from "./CommunityDetailHeader";
import { MembersTab } from "./MembersTab";
import { BadgesTab } from "./BadgesTab";
import { PlaceholderTab } from "./PlaceholderTab";

import { CommunityDetailsTab } from "./CommunityDetail.types";
import { useCommunityDetailsContext } from "./CommunityDetails.context";

export function CommunityDetails() {
  const { isError, error, tab, setTab } = useCommunityDetailsContext();

  if (isError) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <Stack spacing={3} sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
      <CommunityDetailHeader />

      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Tab
          label="Overview"
          value={CommunityDetailsTab.Overview}
          disableRipple
        />
        <Tab
          label="Members"
          value={CommunityDetailsTab.Members}
          disableRipple
        />
        <Tab label="Badges" value={CommunityDetailsTab.Badges} disableRipple />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Governance</span>
              <Chip
                label="coming soon"
                color="success"
                size="small"
                sx={{
                  height: 18,
                  fontSize: (theme) => theme.typography.pxToRem(10),
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            </Stack>
          }
          value={CommunityDetailsTab.Governance}
          disableRipple
        />
        <Tab
          label="Settings"
          value={CommunityDetailsTab.Settings}
          disableRipple
        />
      </Tabs>

      <Box>
        {tab === CommunityDetailsTab.Overview && <OverviewTab />}
        {tab === CommunityDetailsTab.Members && <MembersTab />}
        {tab === CommunityDetailsTab.Badges && <BadgesTab />}
        {tab === CommunityDetailsTab.Governance && (
          <PlaceholderTab label="Governance" />
        )}
        {tab === CommunityDetailsTab.Settings && (
          <PlaceholderTab label="Settings" />
        )}
      </Box>
    </Stack>
  );
}
