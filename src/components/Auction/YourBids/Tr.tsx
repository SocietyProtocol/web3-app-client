"use client";

import { Box, styled } from "@mui/material";

export const Tr = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 60px",
  padding: theme.spacing(2, 1),
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    gridTemplateColumns: "1fr",
    gap: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.border.area}`,
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));
