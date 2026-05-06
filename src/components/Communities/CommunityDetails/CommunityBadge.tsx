"use client";

import { Avatar, Skeleton, Stack, Typography } from "@mui/material";
import NextLink from "next/link";

export interface CommunityBadgeProps {
  id?: string;
  name?: string;
  imageUrl?: string | null;
  isOfficial?: boolean;
  holdersCount?: number | null;
  loading?: boolean;
}

export function CommunityBadge({
  id,
  name,
  imageUrl,
  isOfficial,
  holdersCount,
  loading,
}: CommunityBadgeProps) {
  const avatar = (
    <Avatar
      src={imageUrl ?? (isOfficial ? "/official-badge.svg" : "/badge.svg")}
      alt={name}
      sx={{ width: 52, height: 52 }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = isOfficial
          ? "/official-badge.svg"
          : "/badge.svg";
      }}
    />
  );

  return (
    <Stack spacing={0.75} alignItems="center">
      {loading ? (
        <Skeleton variant="circular" width={52} height={52} />
      ) : (
        <NextLink href={`/badges/${id}`} style={{ display: "flex" }}>
          {avatar}
        </NextLink>
      )}

      {loading ? (
        <Skeleton width={80} height={14} />
      ) : (
        <NextLink href={`/badges/${id}`} style={{ textDecoration: "none" }}>
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontSize: 14,
              color: "text.primary",
              fontWeight: 600,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={name}
          >
            {name}
          </Typography>
        </NextLink>
      )}

      {loading ? (
        <Skeleton width={60} height={12} />
      ) : (
        <Typography
          variant="caption"
          sx={{
            fontSize: 12,
            color: "success.contrastText",
            borderRadius: 1,
            px: 0.75,
            lineHeight: "18px",
          }}
        >
          {holdersCount ?? 0} {(holdersCount ?? 0) === 1 ? "holder" : "holders"}
        </Typography>
      )}
    </Stack>
  );
}
