import { Box, Typography } from "@mui/material";

const COLUMNS = ["Amount", "Lock Date", "Unlock Date", "Operation"];

export const HistoryHeader = () => (
  <Box
    sx={{
      display: { xs: "none", sm: "grid" },
      gridTemplateColumns: "repeat(4, 1fr) 0.2fr",
      px: 2,
      pb: 1,
    }}
  >
    {COLUMNS.map((col) => (
      <Typography
        key={col}
        variant="caption"
        sx={{
          color: "text.primary",
          textTransform: "uppercase",
          fontWeight: 600,
          letterSpacing: 1,
          textAlign: "center",
        }}
      >
        {col}
      </Typography>
    ))}
    <Box />
  </Box>
);
