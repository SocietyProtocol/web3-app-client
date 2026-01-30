"use client";

import { Box, Typography, Tooltip, IconButton } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface HeaderCellProps {
  label: string;
  tooltip: string;
}

export const HeaderCell = ({ label, tooltip }: HeaderCellProps) => (
  <Box
    sx={{
      display: { xs: "none", md: "flex" },
      alignItems: "center",
      gap: 0.5,
    }}
  >
    <Typography
      sx={{
        fontSize: "12px",
        fontWeight: 400,
        color: "text.primary",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Typography>
    <Tooltip title={tooltip} arrow placement="top">
      <IconButton size="small" sx={{ padding: 0 }} aria-label={tooltip}>
        <InfoOutlinedIcon sx={{ fontSize: "14px", color: "text.primary" }} />
      </IconButton>
    </Tooltip>
  </Box>
);
