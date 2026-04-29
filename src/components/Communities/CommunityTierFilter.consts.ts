import { CommunityTier } from "../../data/communities/types";

export const TIER_ORDER: CommunityTier[] = [
  CommunityTier.Gold,
  CommunityTier.Silver,
  CommunityTier.Bronze,
  CommunityTier.Unaffiliated,
];

export const TIER_ICON_SRC: Partial<Record<CommunityTier, string>> = {
  [CommunityTier.Bronze]: "/icons/tier-bronze.svg",
  [CommunityTier.Silver]: "/icons/tier-silver.svg",
  [CommunityTier.Gold]: "/icons/tier-gold.svg",
  [CommunityTier.Unaffiliated]: "/icons/tier-unaffiliated.svg",
};
