import { Box, Skeleton, Stack } from "@mui/material";

export const HistoryRowSkeleton = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
      gap: { xs: 2, sm: 0 },
      px: 2,
      py: 2,
      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
    }}
  >
    {[80, 90, 90, 60].map((w, i) => (
      <Stack
        key={i}
        direction="row"
        alignItems="center"
        justifyContent="center"
      >
        <Skeleton key={i} width={w} height={24} />
      </Stack>
    ))}
  </Box>
);
