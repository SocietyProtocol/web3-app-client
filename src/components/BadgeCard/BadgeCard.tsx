import {
  alpha,
  Avatar,
  Badge,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Address } from "viem";
import { OfficialBadge } from "../icons/OfficialBadge";
import { UserHandle } from "../UserHandle/UserHandle";
import { Holder } from "../icons/Holder";

export interface BadgeCardProps {
  id: number;
  title?: string;
  badgeImageUrl?: string;
  isOfficial?: boolean;
  createdBy?: Address;
  numberOfHolders?: number;
  metadata?: Record<string, string>;
  loading?: boolean;
}

export const BadgeCard = ({
  id,
  title,
  badgeImageUrl,
  isOfficial,
  createdBy,
  numberOfHolders,
  //   metadata,
  loading = false,
}: BadgeCardProps) => {
  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 2,
        boxShadow: "none",
        width: {
          xs: "100%",
          sm: "200px",
        },
        height: 180,
        ...(!loading &&
          isOfficial && {
            border: (theme) =>
              `2px solid ${theme.palette.success.contrastText}`,
          }),
      }}
    >
      {/* Badge ID and Official Label */}
      <Stack
        width="100%"
        p={0.5}
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        {loading ? (
          <Skeleton width={50} />
        ) : (
          <Chip
            label={`ID: ${id}`}
            size="small"
            sx={{
              fontSize: (theme) => theme.typography.pxToRem(8),
              height: 16,
              "& .MuiChip-label": {
                px: 0.5,
              },
            }}
          />
        )}

        {loading ? (
          <Skeleton width={50} />
        ) : (
          isOfficial && (
            <Typography
              variant="caption"
              sx={{
                color: "success.contrastText",
                fontWeight: 700,
                fontSize: (theme) => theme.typography.pxToRem(8),
              }}
            >
              OFFICIAL
            </Typography>
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
        <Badge
          color="success"
          badgeContent={
            isOfficial ? (
              <OfficialBadge
                sx={{
                  color: "success.contrastText",
                  fontSize: 12,
                  backdropFilter: (theme) =>
                    `drop-shadow(0 0 1px ${alpha(
                      theme.palette.success.contrastText,
                      0.8
                    )})`,
                }}
              />
            ) : undefined
          }
          overlap="circular"
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          sx={{
            "& .MuiBadge-badge": {
              background: "transparent",
              minWidth: "unset",
              height: "unset",
              padding: 0,
            },
          }}
        >
          <Avatar
            src={badgeImageUrl}
            alt={title}
            sx={{ width: 52, height: 52 }}
          />
        </Badge>
      )}

      {/* Title */}
      {loading ? (
        <Skeleton width="80%" />
      ) : (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: (theme) => alpha(theme.palette.text.primary, 0.8),
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

      {/* Created By and Number of Holders */}
      <Stack
        width="100%"
        p={0.5}
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography
          component="div"
          variant="caption"
          sx={{
            color: "text.secondary",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: (theme) => theme.typography.pxToRem(8),
          }}
        >
          {loading ? (
            <Skeleton variant="text" width={70} height={10} />
          ) : (
            <>
              Created by:{" "}
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
              )}{" "}
            </>
          )}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          {loading ? (
            <Skeleton variant="text" width={20} height={10} />
          ) : (
            <>
              <Holder
                sx={{
                  fontSize: 12,
                }}
              />
              <Typography
                component="span"
                sx={{
                  color: (theme) => alpha(theme.palette.text.primary, 0.8),
                  fontWeight: 500,
                  fontSize: (theme) => theme.typography.pxToRem(8),
                }}
              >
                {numberOfHolders ?? 0}
              </Typography>
            </>
          )}
        </Stack>
      </Stack>

      {/* {loading ? (
        <Skeleton width="100%" />
      ) : metadata ? (
        <Stack
          width="100%"
          p={0.5}
          spacing={0.5}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Typography
            component="div"
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              fontSize: (theme) => theme.typography.pxToRem(9),
              mb: 0.5,
            }}
          >
            Metadata:
          </Typography>

          {Object.entries(metadata).map(([key, value]) => (
            <Typography
              key={key}
              component="div"
              variant="caption"
              sx={{
                color: "text.secondary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 500,
                fontSize: (theme) => theme.typography.pxToRem(8),
              }}
            >
              {`${key}: ${value}`}
            </Typography>
          ))}
        </Stack>
      ) : null} */}
    </Paper>
  );
};
