"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { LiveRelativeTime } from "@/components/Common/LiveRelativeTime";
import { UserHandle } from "@/components/User/UserHandle";
import { Tr } from "./Tr";
import { CommunityMember } from "@/data/community-members/types";

interface CommunityMemberRowProps {
  member: CommunityMember;
  isManager: boolean;
}

export function CommunityMemberRow({
  member,
  isManager,
}: CommunityMemberRowProps) {
  return (
    <Tr isManager={isManager} role="row">
      <Box role="cell">
        <UserHandle
          id={member.user.id as Hex}
          name={member.user.name}
          bio={member.user.bio}
          imageUrl={member.user.imageUrl}
          highlightYou
          size="medium"
          link
        />
      </Box>

      <Box role="cell">
        {member.timestamp ? (
          <LiveRelativeTime
            timestamp={member.timestamp}
            sx={{
              color: "text.primary",
              fontSize: (theme) => theme.typography.pxToRem(12),
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
        <Stack role="cell" alignItems="flex-end">
          <Button
            variant="text"
            color="error"
            size="small"
            disableRipple
            sx={{
              minWidth: 0,
              "&&": {
                px: 0,
                py: 0,
              },
              justifyContent: "flex-end",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "transparent",
                textDecoration: "underline",
              },
            }}
          >
            Revoke
          </Button>
        </Stack>
      )}
    </Tr>
  );
}
