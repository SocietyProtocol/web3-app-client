"use client";

import { Avatar, capitalize, Skeleton, Stack, Typography } from "@mui/material";
import { TierIcon } from "@/components/Communities/Tier/TierIcon";
import { CommunityTier } from "@/data/communities/types";

interface CommunityDetailHeaderProps {
  community?: { imageUrl?: string | null; name?: string | null } | null;
  isLoading: boolean;
  tierName: CommunityTier;
  tierColor: string;
  badgeCount: number;
  memberCount: number;
}

export function CommunityDetailHeader({
  community,
  isLoading,
  tierName,
  tierColor,
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
        <Skeleton width={100} height={22} sx={{ pl: 1.5 }} />
      ) : (
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ pl: 1.5 }}
        >
          <TierIcon tier={tierName} size={20} />
          <Typography
            sx={{
              fontSize: (t) => t.typography.pxToRem(13),
              fontWeight: 600,
              color: tierColor,
            }}
          >
            {capitalize(tierName)} Community
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
