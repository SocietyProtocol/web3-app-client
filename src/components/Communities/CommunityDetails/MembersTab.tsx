"use client";

import { Box, Stack } from "@mui/material";
import { CommunityMembers } from "./Members/CommunityMembers";
import { CommunityBadgesActions } from "./Members/CommunityBadgesActions";
import { useCommunityDetailsContext } from "./CommunityDetails.context";

export function MembersTab() {
  const { isManager } = useCommunityDetailsContext();

  return (
    <Stack
      spacing={4}
      direction={{ xs: "column", md: isManager ? "row" : "column" }}
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
        <CommunityMembers />
      </Box>
      {isManager && (
        <Box
          sx={{
            width: { xs: "100%", md: "50%" },
          }}
        >
          <CommunityBadgesActions />
        </Box>
      )}
    </Stack>
  );
}
