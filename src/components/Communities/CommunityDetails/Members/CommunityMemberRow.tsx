"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { LiveRelativeTime } from "@/components/Common/LiveRelativeTime";
import { UserHandle } from "@/components/User/UserHandle";
import type { CommunityMember } from "../MembersTab";
import { Tr } from "./Tr";

interface CommunityMemberRowProps {
  member: CommunityMember;
  joinedAt?: string;
  isManager: boolean;
}

export function CommunityMemberRow({
  member,
  joinedAt,
  isManager,
}: CommunityMemberRowProps) {
  return (
    <Tr isManager={isManager} role="row">
      <Box role="cell">
        <UserHandle
          id={member.id as Hex}
          name={member.name}
          bio={member.bio}
          imageUrl={member.imageUrl}
          highlightYou
          size="medium"
          link
        />
      </Box>

      <Box role="cell">
        {joinedAt ? (
          <LiveRelativeTime
            timestamp={joinedAt}
            sx={{
              color: "text.primary",
              fontSize: (theme) => theme.typography.pxToRem(14),
              fontWeight: 500,
            }}
          />
        ) : (
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: (theme) => theme.typography.pxToRem(14),
            }}
          >
            -
          </Typography>
        )}
      </Box>

      {isManager && (
        <Stack role="cell" alignItems="center">
          <Button variant="text" color="error" size="small">
            Revoke
          </Button>
        </Stack>
      )}
    </Tr>
  );
}
