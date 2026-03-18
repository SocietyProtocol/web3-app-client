"use client";

import Image from "next/image";
import { alpha, Box, Card, Stack, Typography } from "@mui/material";
import { TierConfig } from "./consts";

interface TierCardProps {
  tier: TierConfig;
  selected: boolean;
  onSelect: () => void;
}

export const TierCard = ({ tier, selected, onSelect }: TierCardProps) => {
  const { iconSrc, name, color, requiredSpecLabel, benefits } = tier;

  return (
    <Card
      onClick={onSelect}
      elevation={0}
      sx={{
        flex: 1,
        cursor: "pointer",
        bgcolor: (theme) =>
          selected
            ? theme.palette.background.paperDark
            : theme.palette.background.paper,
        border: "1px solid",
        borderColor: (theme) =>
          selected
            ? theme.palette.success.light
            : alpha(theme.palette.primary.main, 0.1),
        borderRadius: 3,
        px: 1.5,
        py: 1.5,
        transition: "border-color, background-color 0.2s",
        "&:hover": {
          ...(!selected && {
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paperDark, 0.25),
            borderColor: (theme) => alpha(theme.palette.success.light, 0.25),
          }),
        },
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Stack alignItems="center" spacing={0.75}>
          <Image src={iconSrc} alt={name} width={36} height={36} />
          <Typography
            sx={{
              color,
              fontWeight: 600,
              fontSize: "1.25rem",
              lineHeight: 1,
            }}
          >
            {name}
          </Typography>
        </Stack>

        <Typography
          variant="h6"
          color="primary.main"
          sx={{ fontWeight: 700, textAlign: "center" }}
        >
          {requiredSpecLabel}
        </Typography>

        <Stack spacing={0.5} sx={{ width: "100%" }}>
          {benefits.map((benefit) => (
            <Box key={benefit} sx={{ display: "flex", gap: 0.75 }}>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ lineHeight: 1.25, flexShrink: 0, fontSize: "11px" }}
              >
                •
              </Typography>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ lineHeight: 1.25, fontSize: "11px" }}
              >
                {benefit}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
};
