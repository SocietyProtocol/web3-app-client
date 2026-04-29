import { CommunityTier } from "@/data/communities/types";
import { capitalize, Stack, Typography } from "@mui/material";
import { TierIcon } from "./TierIcon";
import { getTierColor } from "./utils";
import { useNow } from "@/hooks/useNow";

export interface CommunityTierChipProps {
  tier: CommunityTier;
  expiresAt: string;
}

export const CommunityTierChip = ({
  tier,
  expiresAt,
}: CommunityTierChipProps) => {
  const now = useNow({ updateAt: Number(expiresAt) });

  if (expiresAt && Number(expiresAt) < now) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography
          sx={{
            fontSize: (theme) => theme.typography.pxToRem(12),
            fontWeight: 600,
            color: (theme) => getTierColor(theme, CommunityTier.Unaffiliated),
          }}
        >
          {capitalize(CommunityTier.Unaffiliated)}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <TierIcon tier={tier} size={20} />

      <Typography
        sx={{
          fontSize: (theme) => theme.typography.pxToRem(12),
          fontWeight: 600,
          color: (theme) => getTierColor(theme, tier),
        }}
      >
        {capitalize(tier)}
      </Typography>
    </Stack>
  );
};
