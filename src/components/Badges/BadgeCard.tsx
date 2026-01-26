import {
  Avatar,
  Chip,
  Link,
  Paper,
  Skeleton,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { UserHandle } from "../UserHandle/UserHandle";
import { Logo } from "../icons/Logo";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Hex } from "viem";
import { BadgeData } from "../../data/badges/types";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { OfficialChip } from "./OfficialChip";
import { CommunityChip } from "./CommunityChip";

export interface BadgeCardProps extends Partial<BadgeData> {
  loading?: boolean;
}

const StyledBadgeCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== "isOfficial",
})<{
  isOfficial?: boolean;
}>(({ theme, isOfficial = false }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: 8,
  boxShadow: "none",
  width: "100%",
  height: "220px",

  background: theme.palette.background.page,
  border: `1px solid ${theme.palette.border.card}`,

  ...(isOfficial && {
    border: "none",
    ...theme.mixins.borderGradient("8px", "official"),
    background: theme.palette.gradients.darkOfficial,
  }),
}));

export const BadgeCard = ({
  id,
  name,
  isOfficial,
  isCommunity,
  creatorAddress,
  uri,
  loading = false,
  imageUrl,
}: BadgeCardProps) => {
  return (
    <StyledBadgeCard isOfficial={isOfficial}>
      {/* Badge ID and Official Label */}
      <Stack
        width="100%"
        p={0.5}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        position="relative"
      >
        {loading ? (
          <Skeleton width={50} />
        ) : (
          <Chip
            color={isOfficial ? "gold" : "default"}
            label={`ID: #${id}`}
            size="small"
            sx={{
              fontSize: (theme) => theme.typography.pxToRem(10),
              letterSpacing: "2%",
              height: 18,
              minWidth: 58,
              "& .MuiChip-label": {
                px: 1.5,
                lineHeight: "18px",
              },
            }}
          />
        )}

        {isOfficial && !loading && (
          <Logo
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 20,
              color: "text.primary",
            }}
          />
        )}

        {loading ? (
          <Skeleton width={50} />
        ) : isCommunity ? (
          <CommunityChip isOfficial={isOfficial} />
        ) : (
          isOfficial && <OfficialChip />
        )}
      </Stack>

      {/* Badge Image */}
      {loading ? (
        <Skeleton
          variant="circular"
          width={52}
          height={52}
          sx={{
            flexShrink: 0,
          }}
        />
      ) : (
        <OptionalLink href={`/badges/${id}`}>
          <Avatar
            src={
              imageUrl ?? (isOfficial ? "/official-badge.svg" : "/badge.svg")
            }
            alt={name}
            sx={{ width: 52, height: 52 }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = isOfficial
                ? "/official-badge.svg"
                : "/badge.svg";
            }}
          />
        </OptionalLink>
      )}

      {/* Title */}
      {loading ? (
        <Skeleton width="80%" />
      ) : (
        <OptionalLink href={`/badges/${id}`}>
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              width: "100%",
              flexShrink: 0,
              minHeight: 36,
            }}
            title={name}
          >
            {name}
          </Typography>
        </OptionalLink>
      )}

      {/* Created By */}
      {loading ? (
        <Skeleton variant="text" width={70} height={10} />
      ) : (
        creatorAddress && (
          <Stack
            width="100%"
            p={0.5}
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
          >
            <Typography
              component="span"
              sx={{
                color: "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 500,
                fontSize: (theme) => theme.typography.pxToRem(10),
              }}
            >
              CREATED BY
            </Typography>
            {creatorAddress ? (
              <UserHandle
                address={creatorAddress as Hex}
                size="small"
                showYouLabel={false}
                previewCard
                link
              />
            ) : (
              "Unknown"
            )}
          </Stack>
        )
      )}

      {/* Metadata URL */}
      {loading ? (
        <Skeleton variant="text" width="90%" height={10} />
      ) : (
        uri && (
          <Link
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              width: "100%",
              textAlign: "center",
            }}
          >
            <Typography
              component="span"
              sx={{
                lineHeight: 1,
                color: "text.primary",
                fontSize: "0.75rem",
              }}
            >
              View Metadata
            </Typography>
            <OpenInNewIcon
              sx={{ fontSize: 12, verticalAlign: "middle", ml: 0.5 }}
            />
          </Link>
        )
      )}
    </StyledBadgeCard>
  );
};
