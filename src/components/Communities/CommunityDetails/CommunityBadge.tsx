"use client";

import { Avatar, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import NextLink from "next/link";
import { resolveImageSrc } from "@/components/Avatar/ImageDisplay";
import { holdersLabel } from "./holdersLabel";

export interface CommunityBadgeProps {
  id?: string;
  name?: string;
  imageUrl?: string | null;
  isOfficial?: boolean;
  /** A BigInt field: the subgraph sends it as a string. */
  holdersCount?: number | string | null;
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
      src={
        resolveImageSrc(imageUrl) ??
        (isOfficial ? "/official-badge.svg" : "/badge.svg")
      }
      alt={name}
      sx={{ width: 52, height: 52 }}
      slotProps={{
        img: { referrerPolicy: "no-referrer" },
      }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = isOfficial
          ? "/official-badge.svg"
          : "/badge.svg";
      }}
    />
  );

  return (
    <Stack
      spacing={0.75}
      alignItems="center"
      data-testid={loading ? undefined : "community-badge"}
      data-badge-id={loading ? undefined : id}
      sx={{
        width: "fit-content",
        maxWidth: "200px",
        overflow: "hidden",
      }}
    >
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
        <Tooltip title={name ?? "Badge Name"} placement="bottom">
          <NextLink
            href={`/badges/${id}`}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
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
            >
              {name}
            </Typography>
          </NextLink>
        </Tooltip>
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
          {holdersLabel(holdersCount)}
        </Typography>
      )}
    </Stack>
  );
}
