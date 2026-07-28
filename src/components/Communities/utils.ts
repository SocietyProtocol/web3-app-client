import { CommunityTier } from "@/data/communities/types";
import { Theme } from "@mui/material";

function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Resolves the active community tier using Unix timestamps in seconds.
 *
 * @param tierName - The tier name to return if it has not expired.
 * @param tierExpiresAt - Tier expiration timestamp as a Unix timestamp in seconds.
 * @param now - Current time as a Unix timestamp in seconds. Defaults to the current Unix time in seconds.
 */
export function resolveTierName(
  tierName?: string | null,
  tierExpiresAt?: string | null,
  now?: number,
): CommunityTier {
  const currentTimeSeconds = now ?? getCurrentTimestamp();
  const tierExpiresAtSeconds = tierExpiresAt ? Number(tierExpiresAt) : null;

  if (
    tierName &&
    tierExpiresAtSeconds !== null &&
    tierExpiresAtSeconds > currentTimeSeconds
  ) {
    return tierName as CommunityTier;
  }

  return CommunityTier.Unaffiliated;
}

export function getTierColor(theme: Theme, tier: CommunityTier): string {
  switch (tier) {
    case CommunityTier.Gold:
      return theme.palette.gold.light;
    case CommunityTier.Silver:
      return theme.palette.silver.light;
    case CommunityTier.Bronze:
      return theme.palette.bronze.light;
    case CommunityTier.Unaffiliated:
    default:
      return theme.palette.error.main;
  }
}
