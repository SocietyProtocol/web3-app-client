"use client";

import {
  capitalize,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HideSourceOutlinedIcon from "@mui/icons-material/HideSourceOutlined";
import { BadgeCategory } from "@/data/badges/types";
import { TierToggleButton } from "../Communities/Tier/TierToggleButton";

const CATEGORY_ORDER: BadgeCategory[] = [
  BadgeCategory.Official,
  BadgeCategory.Community,
  BadgeCategory.Individual,
  BadgeCategory.NonAffiliated,
];

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  [BadgeCategory.Official]: "Official",
  [BadgeCategory.Community]: "Community",
  [BadgeCategory.Individual]: "Individual",
  [BadgeCategory.NonAffiliated]: "Non-Affiliated",
};

const CATEGORY_ICONS: Record<BadgeCategory, typeof VerifiedIcon> = {
  [BadgeCategory.Official]: VerifiedIcon,
  [BadgeCategory.Community]: GroupsOutlinedIcon,
  [BadgeCategory.Individual]: PersonOutlineIcon,
  [BadgeCategory.NonAffiliated]: HideSourceOutlinedIcon,
};

export interface BadgeCategoryFilterProps {
  value: BadgeCategory[] | null;
  onChange: (next: BadgeCategory[] | null) => void;
}

export const BadgeCategoryFilter = ({
  value,
  onChange,
}: BadgeCategoryFilterProps) => {
  const theme = useTheme();

  const colorFor = (category: BadgeCategory): string => {
    switch (category) {
      case BadgeCategory.Official:
        // Use the lighter shade so the toggle reads well on the dark page
        // background; the darker `main` is reserved for the badge card
        // gradient where it sits against its own light fill.
        return theme.palette.officialBlue.light;
      case BadgeCategory.Community:
        return theme.palette.success.main;
      case BadgeCategory.Individual:
        return theme.palette.silver.light;
      case BadgeCategory.NonAffiliated:
        return theme.palette.error.main;
      default:
        return theme.palette.text.primary;
    }
  };

  return (
    <ToggleButtonGroup
      value={value ?? []}
      onChange={(_, next) =>
        onChange(next?.length ? (next as BadgeCategory[]) : null)
      }
      aria-label="Filter by badge category"
      sx={{ flexWrap: "wrap", gap: 2 }}
    >
      {CATEGORY_ORDER.map((category) => {
        const color = colorFor(category);
        const Icon = CATEGORY_ICONS[category];

        return (
          <TierToggleButton
            key={category}
            value={category}
            tierColor={color}
            aria-label={`${capitalize(category)} badges`}
            sx={{ textTransform: "none" }}
          >
            <Icon sx={{ fontSize: 18, color }} />
            <Typography
              variant="body2"
              sx={{
                color,
                fontWeight: 700,
                fontSize: "0.875rem",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              {CATEGORY_LABELS[category]}
            </Typography>
          </TierToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
};
