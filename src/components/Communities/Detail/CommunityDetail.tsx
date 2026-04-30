"use client";

import { Box, Chip, Skeleton, Stack, Tab, Tabs } from "@mui/material";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { notFound } from "next/navigation";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";
import { OverviewTab } from "./OverviewTab";
import { CommunityDetailHeader } from "./CommunityDetailHeader";
import { PlaceholderTab } from "./PlaceholderTab";
import { useCommunityDetail } from "./useCommunityDetail";
import {
  CommunityDetailTab,
  CommunityDetailProps,
} from "./CommunityDetail.types";

export function CommunityDetail({ id }: CommunityDetailProps) {
  const {
    community,
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
      CommunityDetailTab.Overview,
      CommunityDetailTab.Members,
      CommunityDetailTab.Badges,
      CommunityDetailTab.Governance,
      CommunityDetailTab.Settings,
    ]).withDefault(CommunityDetailTab.Overview),
  );

  if (isError) {
    return <ErrorDisplay error={error} />;
  }

  if (!isLoading && !community) {
    notFound();
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
          value={CommunityDetailTab.Overview}
          disableRipple
        />
        <Tab label="Members" value={CommunityDetailTab.Members} disableRipple />
        <Tab label="Badges" value={CommunityDetailTab.Badges} disableRipple />
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
          value={CommunityDetailTab.Governance}
          disableRipple
        />
        <Tab
          label="Settings"
          value={CommunityDetailTab.Settings}
          disableRipple
        />
      </Tabs>

      <Box>
        {isLoading ? (
          tab === CommunityDetailTab.Overview ? (
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
            {tab === CommunityDetailTab.Overview && community && (
              <OverviewTab
                communityId={id}
                memberCount={memberCount}
                description={community.description}
              />
            )}
            {tab === CommunityDetailTab.Members && (
              <PlaceholderTab label="Members" />
            )}
            {tab === CommunityDetailTab.Badges && (
              <PlaceholderTab label="Badges" />
            )}
            {tab === CommunityDetailTab.Governance && (
              <PlaceholderTab label="Governance" />
            )}
            {tab === CommunityDetailTab.Settings && (
              <PlaceholderTab label="Settings" />
            )}
          </>
        )}
      </Box>
    </Stack>
  );
}
