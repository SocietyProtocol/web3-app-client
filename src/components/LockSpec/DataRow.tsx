"use client";

import { Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

interface DataRowProps {
  label: string;
  content: ReactNode;
}

export const DataRow = ({ label, content }: DataRowProps) => (
  <Stack spacing={1.5}>
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" color="primary.main">
          {label}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}>
        {content}
      </Stack>
    </Stack>
  </Stack>
);
