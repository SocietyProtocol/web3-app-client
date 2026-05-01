import {
  Avatar,
  Chip,
  Paper,
  Skeleton,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { CommunityData, CommunityTier } from "../../data/communities/types";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { CommunityChip } from "../Badges/CommunityChip";
import { CommunityTierChip } from "./Tier/CommunityTierChip";
import { resolveTierName } from "./utils";
import { useMemo } from "react";
import { useNow } from "@/hooks/useNow";

export interface CommunityCardProps extends Partial<CommunityData> {
  loading?: boolean;
}

const StyledCommunityCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== "tierName",
})<{
  tierName?: CommunityTier;
}>(({ theme, tierName }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: 8,
  boxShadow: "none",
  width: "100%",
  background: theme.palette.background.page,
  border: `1px solid ${theme.palette.border.card}`,

  ...(tierName === CommunityTier.Gold && {
    border: "none",
    ...theme.mixins.borderGradient("8px", "gold"),
    ...theme.mixins.backgroundGradient("135deg", "gold"),
    color: theme.palette.gold.light,
  }),

  ...(tierName === CommunityTier.Silver && {
    border: "none",
    ...theme.mixins.borderGradient("8px", "silver"),
    ...theme.mixins.backgroundGradient("135deg", "silver"),
    color: theme.palette.silver.light,
  }),

  ...(tierName === CommunityTier.Bronze && {
    border: "none",
    ...theme.mixins.borderGradient("8px", "bronze"),
    ...theme.mixins.backgroundGradient("135deg", "bronze"),
    color: theme.palette.bronze.light,
  }),
}));

export const CommunityCard = ({
  id,
  name,
  imageUrl,
  memberCount,
  tierName,
  tierExpiresAt,
  loading = false,
}: CommunityCardProps) => {
  const now = useNow({
    updateAt: tierExpiresAt ? Number(tierExpiresAt) : undefined,
  });

  const realTierName = useMemo(() => {
    return resolveTierName(tierName, tierExpiresAt, now);
  }, [tierName, tierExpiresAt, now]);

  return (
    <StyledCommunityCard tierName={realTierName}>
      {/* Top row: ID chip + COMMUNITY chip */}
      <Stack
        width="100%"
        p={0.5}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          color: "text.primary",
        }}
      >
        {loading ? (
          <Skeleton width={50} />
        ) : (
          <Chip
            color={
              realTierName === CommunityTier.Unaffiliated
                ? "default"
                : realTierName
            }
            label={`ID: #${id}`}
            size="small"
            sx={{
              fontSize: (theme) => theme.typography.pxToRem(10),
              letterSpacing: "2%",
              height: 18,
              minWidth: 58,
              "& .MuiChip-label": { px: 1.5, lineHeight: "18px" },
            }}
          />
        )}
        {loading ? <Skeleton width={80} /> : <CommunityChip />}
      </Stack>

      {/* Avatar */}
      {loading ? (
        <Skeleton
          variant="circular"
          width={52}
          height={52}
          sx={{ flexShrink: 0 }}
        />
      ) : (
        <OptionalLink href={`/communities/${id}`}>
          <Avatar
            src={imageUrl ?? "/images/community.png"}
            alt={name}
            sx={{ width: 52, height: 52 }}
            slotProps={{
              img: {
                onError: (e) => {
                  e.currentTarget.src = "/badge.svg";
                },
              },
            }}
          >
            {!imageUrl && name ? name.charAt(0).toUpperCase() : undefined}
          </Avatar>
        </OptionalLink>
      )}

      {/* Name */}
      {loading ? (
        <Skeleton width="80%" height={28} />
      ) : (
        <OptionalLink
          href={`/communities/${id}`}
          style={{
            textAlign: "center",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: (theme) => theme.typography.pxToRem(14),
              color: "inherit",
              textAlign: "center",
            }}
            title={name}
          >
            {name}
          </Typography>
        </OptionalLink>
      )}

      {/* Members count */}
      {loading ? (
        <Skeleton variant="text" width={80} height={16} />
      ) : (
        <Typography
          sx={{
            fontSize: (theme) => theme.typography.pxToRem(12),
            color: "text.primary",
            fontWeight: 400,
            userSelect: "none",
          }}
        >
          {memberCount ?? 0} Members
        </Typography>
      )}

      {/* Bottom row: Tier */}
      <Stack
        width="100%"
        px={0.5}
        pb={0.5}
        mt="auto"
        direction="row"
        alignItems="center"
        justifyContent="center"
      >
        {loading ? (
          <Skeleton width={50} />
        ) : tierName && tierExpiresAt ? (
          <CommunityTierChip tier={tierName} expiresAt={tierExpiresAt} />
        ) : null}
      </Stack>
    </StyledCommunityCard>
  );
};
