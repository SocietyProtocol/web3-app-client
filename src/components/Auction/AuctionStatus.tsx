"use client";

import { Box, Chip } from "@mui/material";

export const AuctionStatus = () => {
  return (
    <Chip
      color="success"
      size="small"
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "success.contrastText",
            }}
          />
          Active
        </Box>
      }
      sx={{
        height: 20,
        fontSize: "0.75rem",
        padding: ({ spacing }) => spacing(0.5),
        "& .MuiChip-label": {
          padding: 0,
        },
      }}
    />
  );
};
