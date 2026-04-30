"use client";

import { Avatar, Skeleton, Stack, Typography } from "@mui/material";
import { CommunityTier } from "@/data/communities/types";
import { TierStatusDisplay } from "./TierStatusDisplay";

interface CommunityDetailHeaderProps {
  community?: { imageUrl?: string | null; name?: string | null } | null;
  isLoading: boolean;
  tierName: CommunityTier;
  tierColor: string;
  tierExpiresAt?: string | null;
  badgeCount: number;
  memberCount: number;
}

export function CommunityDetailHeader({
  community,
  isLoading,
  tierName,
  tierColor,
  tierExpiresAt,
  badgeCount,
  memberCount,
}: CommunityDetailHeaderProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      {/* Logo */}
      {isLoading ? (
        <Skeleton
          variant="circular"
          width={70}
          height={70}
          sx={{ flexShrink: 0 }}
        />
      ) : (
        <Avatar
          src={community?.imageUrl ?? "/images/community.png"}
          alt={community?.name ?? "Community Logo"}
          sx={{ width: 70, height: 70, flexShrink: 0 }}
          slotProps={{
            img: {
              onError: (e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/images/community.png";
              },
            },
          }}
        >
          {!community?.imageUrl && community?.name
            ? community.name.charAt(0).toUpperCase()
            : undefined}
        </Avatar>
      )}

      {/* Name + stats */}
      <Stack spacing={0.25}>
        {isLoading ? (
          <>
            <Skeleton width={160} height={26} />
            <Skeleton width={120} height={18} />
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontSize: (theme) => theme.typography.pxToRem(18),
                fontWeight: 700,
                color: "text.primary",
                fontFamily: (t) => t.typography.subtitle1.fontFamily,
              }}
            >
              {community?.name}
            </Typography>
            <Typography
              sx={{
                fontSize: (theme) => theme.typography.pxToRem(12),
                color: "text.secondary",
              }}
            >
              {memberCount} Members · {badgeCount} Badges
            </Typography>
          </>
        )}
      </Stack>

      {/* Tier */}
      {isLoading ? (
        <Skeleton width={100} height={22} sx={{ pl: 2 }} />
      ) : (
        <TierStatusDisplay
          tierName={tierName}
          tierColor={tierColor}
          tierExpiresAt={tierExpiresAt}
        />
      )}
    </Stack>
  );
}
