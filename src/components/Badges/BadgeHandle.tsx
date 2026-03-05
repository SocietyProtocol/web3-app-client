import { Box, Chip, Skeleton, Tooltip, Typography } from "@mui/material";
import { OptionalLink } from "../OptionalLink/OptionalLink";

export interface BadgeHandleProps {
  id: string;
  name: string;
  profileUser?: {
    name?: string | null;
  } | null;
  loading?: boolean;
  link?: boolean;
}

export const BadgeHandle = ({
  id,
  name,
  profileUser,
  loading,
  link = false,
}: BadgeHandleProps) => {
  const label = profileUser ? `User (${profileUser.name})` : name;

  return (
    <OptionalLink
      href={link ? `/badges/${id}` : undefined}
      aria-label={link ? `View badge “${name}” (ID #${id})` : undefined}
      title={link ? `View badge “${name}” (ID #${id})` : undefined}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1,
          rowGap: 1,
        }}
      >
        {loading ? (
          <Skeleton width={100} height={20} />
        ) : (
          <>
            <Chip
              color="gold"
              label={`ID #${id}`}
              size="small"
              sx={{
                height: 18,
              }}
            />

            <Tooltip title={label} arrow>
              <Typography
                component="span"
                variant="body2"
                sx={{
                  color: "text.primary",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  maxWidth: 150,
                }}
              >
                {label}
              </Typography>
            </Tooltip>
          </>
        )}
      </Box>
    </OptionalLink>
  );
};
