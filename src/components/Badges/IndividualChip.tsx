import { Stack, Typography } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

interface IndividualChipProps {
  size?: "small" | "medium";
}

/**
 * Visual marker for badges that are neither official nor tied to a
 * community — i.e. created by an individual user. Mirrors the shape of
 * OfficialChip / CommunityChip but uses a person icon as the affordance.
 */
export const IndividualChip = ({ size = "small" }: IndividualChipProps) => {
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
        INDIVIDUAL
      </Typography>
      <PersonOutlineIcon
        sx={{
          fontSize: size === "small" ? 12 : 16,
          color: "text.primary",
        }}
      />
    </Stack>
  );
};
