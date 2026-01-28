import { alpha, Stack, Typography } from "@mui/material";
import { BadgeIcon } from "../icons/BadgeIcon";

interface OfficialChipProps {
  size?: "small" | "medium";
}

export const OfficialChip = ({ size = "small" }: OfficialChipProps) => {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography
        color="textPrimary"
        sx={{
          fontWeight: 700,
          fontSize: (theme) =>
            theme.typography.pxToRem(size === "small" ? 10 : 14),
        }}
      >
        OFFICIAL
      </Typography>
      <BadgeIcon
        isOfficial
        sx={{
          fontSize: size === "small" ? 12 : 16,
          filter: (theme) =>
            `drop-shadow(0 0 1px ${alpha(theme.palette.gold.main, 0.8)})`,
        }}
      />
    </Stack>
  );
};
