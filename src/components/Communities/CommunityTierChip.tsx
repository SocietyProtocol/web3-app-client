import { CommunityTier } from "@/data/communities/types";
import { capitalize, Stack, Typography } from "@mui/material";
import { TierIcon } from "./TierIcon";
import { getTierColor } from "./utils";
import { useNow } from "@/hooks/useNow";
import { useMemo } from "react";

export interface CommunityTierChipProps {
  tier: CommunityTier;
  expiresAt: string;
}

export const CommunityTierChip = ({
  tier,
  expiresAt,
}: CommunityTierChipProps) => {
  const now = useNow({ updateAt: Number(expiresAt) });

  const realTier = useMemo(
    () =>
      expiresAt && Number(expiresAt) < now ? CommunityTier.Unaffiliated : tier,
    [expiresAt, tier, now],
  );

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <TierIcon tier={realTier} size={20} />

      <Typography
        sx={{
          fontSize: (theme) => theme.typography.pxToRem(10),
          fontWeight: 600,
          color: (theme) => getTierColor(theme, realTier),
          userSelect: "none",
        }}
      >
        {capitalize(realTier)}
      </Typography>
    </Stack>
  );
};
