"use client";

import {
  capitalize,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import { CommunityTier } from "../../data/communities/types";
import { TIER_ORDER } from "./CommunityTierFilter.consts";
import { TierIcon } from "./TierIcon";
import { TierToggleButton } from "./TierToggleButton";
import { getTierColor } from "./utils";

export interface CommunityTierFilterProps {
  value: CommunityTier[] | null;
  onChange: (tiers: CommunityTier[] | null) => void;
}

export const CommunityTierFilter = ({
  value,
  onChange,
}: CommunityTierFilterProps) => {
  const theme = useTheme();

  return (
    <ToggleButtonGroup
      value={value ?? []}
      onChange={(_, next) =>
        onChange(next?.length ? (next as CommunityTier[]) : null)
      }
      aria-label="Filter by tier"
      sx={{ flexWrap: "wrap", gap: 2 }}
    >
      {TIER_ORDER.map((tier) => {
        const color = getTierColor(theme, tier);

        return (
          <TierToggleButton
            key={tier}
            value={tier}
            tierColor={color}
            aria-label={`${capitalize(tier)} tier`}
          >
            <TierIcon tier={tier} />
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
              {capitalize(tier)}
            </Typography>
          </TierToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
};
