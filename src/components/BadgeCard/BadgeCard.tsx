import {
  alpha,
  Avatar,
  Chip,
  Paper,
  Skeleton,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { Address } from "viem";
import { OfficialBadge } from "../icons/OfficialBadge";
import { UserHandle } from "../UserHandle/UserHandle";
import { Logo } from "../icons/Logo";
import Link from "next/link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export interface BadgeCardProps {
  id: number;
  title?: string;
  badgeImageUrl?: string;
  isOfficial?: boolean;
  createdBy?: Address;
  numberOfHolders?: number;
  metadataUrl?: string;
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
  height: "200px",

  background: theme.palette.background.page,
  border: `1px solid ${theme.palette.border.card}`,

  [theme.breakpoints.up("sm")]: {
    width: "200px",
  },

  ...(isOfficial && {
    border: "none",
    ...theme.mixins.borderGradient("8px", "official"),
    background: theme.palette.gradients.darkOfficial,
  }),
}));

export const BadgeCard = ({
  id,
  title,
  badgeImageUrl,
  isOfficial,
  createdBy,
  metadataUrl,
  loading = false,
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
        ) : (
          isOfficial && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography
                variant="caption"
                color="textPrimary"
                sx={{
                  fontWeight: 700,
                  fontSize: (theme) => theme.typography.pxToRem(10),
                }}
              >
                OFFICIAL
              </Typography>
              <OfficialBadge
                sx={{
                  fontSize: 12,
                  filter: (theme) =>
                    `drop-shadow(0 0 1px ${alpha(
                      theme.palette.gold.main,
                      0.8
                    )})`,
                }}
              />
            </Stack>
          )
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
        <Avatar
          src={badgeImageUrl}
          alt={title}
          sx={{ width: 52, height: 52 }}
        />
      )}

      {/* Title */}
      {loading ? (
        <Skeleton width="80%" />
      ) : (
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
          }}
          title={title}
        >
          {title}
        </Typography>
      )}

      {/* Created By */}

      {loading ? (
        <Skeleton variant="text" width={70} height={10} />
      ) : (
        createdBy && (
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
              variant="caption"
              sx={{
                lineHeight: 1,
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
            {createdBy ? (
              <UserHandle
                address={createdBy}
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
        metadataUrl && (
          <Link
            href={metadataUrl}
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
              variant="caption"
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
