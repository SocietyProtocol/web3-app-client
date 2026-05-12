import { Box, Chip, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { Community } from "../../../.graphclient";

const MAX_COMMUNITY_NAME_LENGTH = 12;

export interface BadgeHandleProps {
  id: string;
  name: string;
  profileUser?: {
    name?: string | null;
  } | null;
  community?: Pick<Community, "id" | "name"> | null;
  loading?: boolean;
  link?: boolean;
  fullWidth?: boolean;
}

export const BadgeHandle = ({
  id,
  name,
  profileUser,
  community,
  loading,
  link = false,
  fullWidth = false,
}: BadgeHandleProps) => {
  const label = profileUser
    ? profileUser.name
      ? `User (${profileUser.name})`
      : "User (no name)"
    : name;

  const tooltip = community
    ? `Badge #${id} ${label} for community ${community.name} (ID ${community.id})`
    : `Badge #${id} ${label}`;

  return (
    <OptionalLink
      href={link ? `/badges/${id}` : undefined}
      aria-label={link ? `View badge “${label}” (ID #${id})` : undefined}
      title={link ? `View badge “${label}” (ID #${id})` : undefined}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1,
          rowGap: 1,
          width: fullWidth ? "100%" : "auto",
        }}
      >
        {loading ? (
          <Skeleton width={100} height={20} />
        ) : (
          <Tooltip title={tooltip} arrow>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%" }}
            >
              <Chip
                color={community ? "info" : "gold"}
                label={
                  community
                    ? `${community.name.length > MAX_COMMUNITY_NAME_LENGTH ? community.name.slice(0, MAX_COMMUNITY_NAME_LENGTH) + "..." : community.name} (${community.id}) · #${id}`
                    : `#${id}`
                }
                size="small"
                sx={{
                  height: 18,
                }}
              />

              <Typography
                component="span"
                variant="body2"
                sx={{
                  color: "text.primary",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  maxWidth: 220,
                }}
              >
                {label}
              </Typography>
            </Stack>
          </Tooltip>
        )}
      </Box>
    </OptionalLink>
  );
};
