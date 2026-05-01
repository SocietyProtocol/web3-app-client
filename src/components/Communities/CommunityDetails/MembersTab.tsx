"use client";

import { Box, Stack } from "@mui/material";
import { CommunityMembers } from "./Members/CommunityMembers";

export interface CommunityMember {
  id: string;
  name?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
}

export interface MemberJoinedActivity {
  id: string;
  timestamp: string | number | bigint;
  user?: {
    id: string;
  } | null;
}

interface MembersTabProps {
  members: CommunityMember[];
  memberJoinedActivities: MemberJoinedActivity[];
  managerAddress?: string;
  isLoading: boolean;
}

export function MembersTab({
  members,
  memberJoinedActivities,
  managerAddress,
  isLoading,
}: MembersTabProps) {
  return (
    <Stack
      spacing={4}
      direction="row"
      sx={{
        width: "100%",
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
        }}
      >
        <CommunityMembers
          members={members}
          memberJoinedActivities={memberJoinedActivities}
          managerAddress={managerAddress}
          isLoading={isLoading}
        />
      </Box>
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
        }}
      />
    </Stack>
  );
}
