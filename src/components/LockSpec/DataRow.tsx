"use client";

import { Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

interface DataRowProps {
  label: string;
  content: ReactNode;
}

export const DataRow = ({ label, content }: DataRowProps) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    alignItems={{ xs: "flex-start", sm: "center" }}
    justifyContent="space-between"
    spacing={{ xs: 0.75, sm: 1 }}
  >
    <Typography variant="body2" color="primary.main">
      {label}
    </Typography>
    <Stack direction="row" alignItems="center" spacing={1}>
      {content}
    </Stack>
  </Stack>
);
