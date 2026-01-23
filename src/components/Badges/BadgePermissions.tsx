import { Box, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { Badge } from "../../../.graphclient";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { BadgeHandle } from "./BadgeHandle";

interface BadgePermissionsProps {
  label: string;
  tooltip: string;
  isLoading?: boolean;
  permissionBadges?: Array<Pick<Badge, "id" | "name">>;
}

export const BadgePermissions = ({
  label,
  tooltip,
  isLoading = false,
  permissionBadges,
}: BadgePermissionsProps) => {
  return (
    <Stack spacing={1} padding={1} alignItems="flex-start">
      <Typography
        variant="body1"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontWeight: 700,
          color: "text.primary",
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
      >
        <Tooltip title={tooltip} arrow placement="top">
          <InfoOutlineIcon sx={{ cursor: "help", fontSize: 16 }} />
        </Tooltip>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" paddingLeft={1.5}>
        {permissionBadges?.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              whiteSpace: "nowrap",
            }}
          >
            No one
          </Typography>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                whiteSpace: "nowrap",
              }}
            >
              Holders of:
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 1,
                rowGap: 1,
                flexWrap: "wrap",
              }}
            >
              {isLoading ? (
                <Skeleton width={100} height={20} />
              ) : (
                permissionBadges?.map(({ id, name }) => (
                  <BadgeHandle key={id} id={id} name={name} />
                ))
              )}
            </Box>
          </>
        )}
      </Stack>
    </Stack>
  );
};
