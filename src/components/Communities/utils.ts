import { CommunityTier } from "@/data/communities/types";
import { Theme } from "@mui/material";

export function getTierColor(theme: Theme, tier: CommunityTier): string {
  switch (tier) {
    case CommunityTier.Gold:
      return theme.palette.gold.light;
    case CommunityTier.Silver:
      return theme.palette.text.primary;
    case CommunityTier.Bronze:
      return theme.palette.warning.light;
    case CommunityTier.Unaffiliated:
    default:
      return theme.palette.error.main;
  }
}
