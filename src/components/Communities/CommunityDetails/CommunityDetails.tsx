"use client";

import { Box, Chip, Skeleton, Stack, Tab, Tabs } from "@mui/material";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";
import { OverviewTab } from "./OverviewTab";
import { CommunityDetailHeader } from "./CommunityDetailHeader";
import { MembersTab } from "./MembersTab";
import { PlaceholderTab } from "./PlaceholderTab";
import { useCommunityDetail } from "./useCommunityDetail";
import {
  CommunityDetailsTab,
  CommunityDetailsProps,
} from "./CommunityDetail.types";

export function CommunityDetails({ id }: CommunityDetailsProps) {
  const {
    community,
    memberJoinedActivities,
    isLoading,
    isError,
    error,
    tierName,
    tierColor,
    badgeCount,
    memberCount,
  } = useCommunityDetail(id);

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum([
      CommunityDetailsTab.Overview,
      CommunityDetailsTab.Members,
      CommunityDetailsTab.Badges,
      CommunityDetailsTab.Governance,
      CommunityDetailsTab.Settings,
    ]).withDefault(CommunityDetailsTab.Overview),
  );

  if (isError) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <Stack spacing={3} sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
      <CommunityDetailHeader
        community={community}
        isLoading={isLoading}
        tierName={tierName}
        tierColor={tierColor}
        tierExpiresAt={community?.tierExpiresAt}
        badgeCount={badgeCount}
        memberCount={memberCount}
      />

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
        {isLoading ? (
          tab === CommunityDetailsTab.Overview ? (
            <Stack spacing={2}>
              <Skeleton width={120} height={24} />
              <Skeleton width="100%" height={80} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Skeleton width={160} height={24} />
              <Skeleton width="100%" height={56} />
              <Skeleton width="100%" height={56} />
            </Stack>
          )
        ) : (
          <>
            {tab === CommunityDetailsTab.Overview && community && (
              <OverviewTab
                communityId={id}
                memberCount={memberCount}
                description={community.description}
              />
            )}
            {tab === CommunityDetailsTab.Members && (
              <MembersTab
                members={community?.members ?? []}
                memberJoinedActivities={memberJoinedActivities}
                managerAddress={community?.managerAddress}
                isLoading={isLoading}
              />
            )}
            {tab === CommunityDetailsTab.Badges && (
              <PlaceholderTab label="Badges" />
            )}
            {tab === CommunityDetailsTab.Governance && (
              <PlaceholderTab label="Governance" />
            )}
            {tab === CommunityDetailsTab.Settings && (
              <PlaceholderTab label="Settings" />
            )}
          </>
        )}
      </Box>
    </Stack>
  );
}
