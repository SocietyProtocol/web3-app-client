"use client";

import { Box, Chip, Stack, Tab, Tabs } from "@mui/material";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";
import { OverviewTab } from "./OverviewTab";
import { CommunityDetailHeader } from "./CommunityDetailHeader";
import { MembersTab } from "./MembersTab";
import { BadgesTab } from "./BadgesTab";
import { GovernanceTab } from "./GovernanceTab";
import { SettingsTab } from "./SettingsTab";
import { CommunityDetailsTab } from "./CommunityDetail.types";
import { useCommunityDetailsContext } from "./CommunityDetails.context";

export function CommunityDetails() {
  const { isError, error, tab, setTab, isManager } =
    useCommunityDetailsContext();

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
                label="Coming Soon"
                color="success"
                size="small"
                sx={{
                  textTransform: "none",
                  height: 18,
                  fontSize: (theme) => theme.typography.pxToRem(10),
                  transform: "translateY(-2px)",
                }}
              />
            </Stack>
          }
          value={CommunityDetailsTab.Governance}
          disableRipple
        />
        {isManager && (
          <Tab
            label="Settings"
            value={CommunityDetailsTab.Settings}
            disableRipple
          />
        )}
      </Tabs>

      <Box>
        {tab === CommunityDetailsTab.Overview && <OverviewTab />}
        {tab === CommunityDetailsTab.Members && <MembersTab />}
        {tab === CommunityDetailsTab.Badges && <BadgesTab />}
        {tab === CommunityDetailsTab.Governance && <GovernanceTab />}
        {isManager && tab === CommunityDetailsTab.Settings && <SettingsTab />}
      </Box>
    </Stack>
  );
}
