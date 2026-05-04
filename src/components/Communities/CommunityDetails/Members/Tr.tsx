"use client";

import { Box, styled } from "@mui/material";

export const Tr = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isManager",
})<{ isManager?: boolean }>(({ theme, isManager = false }) => ({
  display: "grid",
  gridTemplateColumns: isManager ? "1.4fr 1fr 0.8fr" : "1.4fr 1fr",
  padding: theme.spacing(2, 2),
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    gridTemplateColumns: isManager ? "2fr 1fr 0.8fr" : "2fr 1fr",
    gap: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.border.area}`,
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));
