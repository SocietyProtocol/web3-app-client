"use client";

import { Avatar, Skeleton, Stack, Typography } from "@mui/material";
import { TierStatusDisplay } from "./TierStatusDisplay";
import { useCommunityDetailsContext } from "./CommunityDetails.context";

export function CommunityDetailHeader() {
  const { community, isLoading, tierName, tierColor, badgeCount, memberCount } =
    useCommunityDetailsContext();

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
          tierExpiresAt={community?.tierExpiresAt}
        />
      )}
    </Stack>
  );
}
