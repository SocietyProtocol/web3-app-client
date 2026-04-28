import {
  Avatar,
  Box,
  capitalize,
  Chip,
  Paper,
  Skeleton,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { CommunityData } from "../../data/communities/types";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { CommunityChip } from "../Badges/CommunityChip";
import { TierIcon } from "./TierIcon";
import { getTierColor } from "./utils";

export interface CommunityCardProps extends Partial<CommunityData> {
  loading?: boolean;
}

const StyledCommunityCard = styled(Paper)(({ theme }) => ({
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
}));

export const CommunityCard = ({
  id,
  name,
  imageUrl,
  memberCount,
  tier,
  loading = false,
}: CommunityCardProps) => {
  return (
    <StyledCommunityCard>
      {/* Top row: ID chip + COMMUNITY chip */}
      <Stack
        width="100%"
        p={0.5}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        {loading ? (
          <Skeleton width={50} />
        ) : (
          <Chip
            color="default"
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
          width={90}
          height={90}
          sx={{ flexShrink: 0 }}
        />
      ) : (
        <OptionalLink href={`/communities/${id}`}>
          <Avatar
            src={imageUrl ?? undefined}
            alt={name}
            sx={{ width: 68, height: 68 }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/badge.svg";
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
              fontSize: (theme) => theme.typography.pxToRem(16),
              color: "text.primary",
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
            fontSize: (theme) => theme.typography.pxToRem(13),
            color: "text.primary",
            fontWeight: 400,
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
        justifyContent="flex-end"
      >
        {loading ? (
          <Skeleton width={50} />
        ) : tier ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TierIcon tier={tier} size={20} />

            <Typography
              sx={{
                fontSize: (theme) => theme.typography.pxToRem(12),
                fontWeight: 600,
                color: (theme) => getTierColor(theme, tier),
              }}
            >
              {capitalize(tier)}
            </Typography>
          </Stack>
        ) : (
          <Box />
        )}
      </Stack>
    </StyledCommunityCard>
  );
};
