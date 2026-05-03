"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { LiveRelativeTime } from "@/components/Common/LiveRelativeTime";
import { UserHandle } from "@/components/User/UserHandle";
import { useBurnBadgeMutation } from "@/components/Badges/BurnBadge/useBurnBadgeMutation";
import { Tr } from "./Tr";
import { CommunityMember } from "@/data/community-members/types";
import { useMemo } from "react";

interface CommunityMemberRowProps {
  member: CommunityMember;
  isManager: boolean;
  memberBadgeId?: string;
}

export function CommunityMemberRow({
  member,
  isManager,
  memberBadgeId,
}: CommunityMemberRowProps) {
  const queryClient = useQueryClient();

  const burnBadge = useBurnBadgeMutation(
    useMemo(
      () => ({
        args: memberBadgeId
          ? {
              id: BigInt(memberBadgeId),
              holder: member.user.id as Hex,
            }
          : undefined,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["communities"] });
          queryClient.invalidateQueries({
            queryKey: ["community", member.community.id],
          });
          queryClient.invalidateQueries({
            queryKey: ["communityMembers", member.community.id],
          });
          queryClient.invalidateQueries({
            queryKey: ["communityMembersInfinite", member.community.id],
          });
        },
      }),
      [memberBadgeId, member.user.id, member.community.id, queryClient],
    ),
  );

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
            disabled={!memberBadgeId || burnBadge.isLoading}
            onClick={() => burnBadge.execute()}
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
