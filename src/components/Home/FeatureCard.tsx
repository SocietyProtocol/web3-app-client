"use client";

import { Box, Stack, SxProps, Theme, Typography } from "@mui/material";
import { ReactNode } from "react";
import { mergeSx } from "@/utils/sx";

export interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  highlighted?: boolean;
  sx?: SxProps<Theme>;
  children?: ReactNode;
}

export const FeatureCard = ({
  icon,
  title,
  description,
  actions,
  highlighted = false,
  sx,
  children,
}: FeatureCardProps) => {
  return (
    <Box
      sx={mergeSx(
        {
          backgroundColor: "background.page",
          border: (theme) =>
            `1px solid ${
              highlighted
                ? theme.palette.warning.light
                : theme.palette.border.bubble
            }`,
          borderRadius: { xs: 6, md: 7 },
          padding: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: { md: 360 },
          transition: "border-color 0.2s ease",
        },
        sx,
      )}
    >
      <Box sx={{ width: 24, height: 24, opacity: 0.85, mb: 1 }}>{icon}</Box>

      <Typography
        variant="h5"
        component="h3"
        sx={{
          color: "primary.main",
          fontSize: { xs: "1.5rem", md: "1.75rem" },
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          color: "text.tertiary",
          fontSize: "0.9375rem",
          lineHeight: 1.6,
          flexGrow: 1,
        }}
      >
        {description}
      </Typography>

      {actions && (
        <Stack sx={{ mt: "auto", pt: 1 }} spacing={1}>
          {actions}
        </Stack>
      )}

      {children}
    </Box>
  );
};
