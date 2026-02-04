"use client";

import { styled, Typography } from "@mui/material";

export const Status = styled(Typography)<{
  status: "Placed" | "Pending" | "Cancelled";
}>(({ theme, status }) => ({
  fontSize: "14px",
  fontWeight: 700,
  color:
    status === "Placed"
      ? theme.palette.success.light
      : status === "Pending"
        ? theme.palette.warning.light
        : theme.palette.error.light,
}));
