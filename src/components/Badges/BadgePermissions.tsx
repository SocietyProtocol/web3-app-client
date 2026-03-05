import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { Badge } from "../../../.graphclient";
import { BadgeHandle } from "./BadgeHandle";
import { WithTooltip } from "../WithTooltip/WithTooltip";

interface BadgePermissionsProps {
  label: string;
  tooltip: string;
  isLoading?: boolean;
  permissionBadges?: Array<
    Pick<Badge, "id" | "name"> & {
      profileUser?: {
        name?: string | null;
      } | null;
    }
  >;
}

export const BadgePermissions = ({
  label,
  tooltip,
  isLoading = false,
  permissionBadges,
}: BadgePermissionsProps) => {
  return (
    <Stack spacing={1} padding={1} alignItems="flex-start">
      <WithTooltip
        variant="body1"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
        tooltip={tooltip}
      >
        {label}
      </WithTooltip>
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
                permissionBadges?.map(({ id, name, profileUser }) => (
                  <BadgeHandle
                    key={id}
                    id={id}
                    name={name}
                    profileUser={profileUser}
                    link
                  />
                ))
              )}
            </Box>
          </>
        )}
      </Stack>
    </Stack>
  );
};
