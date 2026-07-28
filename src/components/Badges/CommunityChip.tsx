import { alpha, Stack, Typography } from "@mui/material";
import { BadgeIcon } from "../icons/BadgeIcon";

interface CommunityChipProps {
  size?: "small" | "medium";
  isOfficial?: boolean;
}

export const CommunityChip = ({
  size = "small",
  isOfficial,
}: CommunityChipProps) => {
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
        COMMUNITY
      </Typography>
      <BadgeIcon
        sx={{
          fontSize: size === "small" ? 12 : 16,
          ...(!isOfficial && {
            color: (theme) => theme.palette.success.main,
          }),
          filter: (theme) =>
            `drop-shadow(0 0 1px ${alpha(
              isOfficial
                ? theme.palette.officialBlue.main
                : theme.palette.success.main,
              0.8,
            )})`,
        }}
        isOfficial={isOfficial}
      />
    </Stack>
  );
};
