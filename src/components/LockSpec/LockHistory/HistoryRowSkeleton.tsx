import { Box, Skeleton, Stack } from "@mui/material";

const WIDTHS = [80, 90, 90, 60];

export const HistoryRowSkeleton = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr) 0.2fr" },
      gap: { xs: 2, sm: 0 },
      px: 2,
      py: 2,
      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
    }}
  >
    {WIDTHS.map((w, i) => (
      <Stack key={i} direction="row" alignItems="center" justifyContent={{ xs: "flex-start", sm: "center" }}>
        <Skeleton width={w} height={24} />
      </Stack>
    ))}
    {/* Empty 5th column on sm+ */}
    <Box sx={{ display: { xs: "none", sm: "block" } }} />
  </Box>
);
