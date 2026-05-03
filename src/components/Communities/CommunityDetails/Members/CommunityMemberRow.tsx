"use client";

import { Box, Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { LiveRelativeTime } from "@/components/Common/LiveRelativeTime";
import { UserHandle } from "@/components/User/UserHandle";
import { useBurnBadgeMutation } from "@/components/Badges/BurnBadge/useBurnBadgeMutation";
import { Tr } from "./Tr";
import { CommunityMember } from "@/data/community-members/types";
import { useMemo } from "react";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { CopyButton } from "@/components/CopyButton/CopyButton";

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
  const burnBadge = useBurnBadgeMutation(
    useMemo(
      () => ({
        args: memberBadgeId
          ? {
              id: BigInt(memberBadgeId),
              holder: member.user.id as Hex,
            }
          : undefined,
        successMessage: `Badge revoked from ${member.user.name ?? member.user.id}`,
      }),

      [memberBadgeId, member.user.id, member.user.name],
    ),
  );

  return (
    <Tr isManager={isManager} role="row">
      <Stack role="cell" direction="row" alignItems="center" gap={1}>
        <UserHandle
          id={member.user.id as Hex}
          name={member.user.name}
          bio={member.user.bio}
          imageUrl={member.user.imageUrl}
          highlightYou
          showPreview
          size="medium"
          link
        />

        <CopyButton
          textToCopy={member.user.id as Hex}
          tooltipText="Copy address"
        />
      </Stack>

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
          <TransactionButton
            variant="text"
            color="error"
            size="small"
            disableRipple
            disabled={!memberBadgeId}
            loading={burnBadge.isLoading}
            loadingText="Revoking..."
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
          </TransactionButton>
        </Stack>
      )}
    </Tr>
  );
}
