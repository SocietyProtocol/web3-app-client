import Image from "next/image";
import { CommunityTier } from "../../data/communities/types";
import { TIER_ICON_SRC } from "./CommunityTierFilter.consts";

interface TierIconProps {
  tier: CommunityTier;
  size?: number;
}

export const TierIcon = ({ tier, size = 16 }: TierIconProps) => {
  const iconSrc = TIER_ICON_SRC[tier];

  if (!iconSrc) {
    return null;
  }

  return (
    <Image src={iconSrc} alt="" aria-hidden="true" width={size} height={size} />
  );
};
