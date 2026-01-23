import { Box, Chip, Skeleton, Typography } from "@mui/material";
import Link from "next/link";

export interface BadgeHandleProps {
  id: string;
  name: string;
  loading?: boolean;
}

export const BadgeHandle = ({ id, name, loading }: BadgeHandleProps) => {
  return (
    <Link href={`/badges/${id}`}>
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
            <Chip color="gold" label={`ID #${id}`} size="small" />

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
    </Link>
  );
};
