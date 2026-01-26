import { Box, Chip, Skeleton, Typography } from "@mui/material";
import { OptionalLink } from "../OptionalLink/OptionalLink";

export interface BadgeHandleProps {
  id: string;
  name: string;
  loading?: boolean;
  link?: boolean;
}

export const BadgeHandle = ({
  id,
  name,
  loading,
  link = false,
}: BadgeHandleProps) => {
  return (
    <OptionalLink href={link ? `/badges/${id}` : undefined}>
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

            <Typography
              component="span"
              variant="body2"
              sx={{
                color: "text.primary",
              }}
            >
              {name}
            </Typography>
          </>
        )}
      </Box>
    </OptionalLink>
  );
};
