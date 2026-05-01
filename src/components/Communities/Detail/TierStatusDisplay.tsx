import { capitalize, Stack, Typography } from "@mui/material";
import { TierIcon } from "@/components/Communities/Tier/TierIcon";
import { CommunityTier } from "@/data/communities/types";
import { WithTooltip } from "@/components/WithTooltip/WithTooltip";
import { formatDate } from "@/utils/date";
import { useMemo } from "react";

interface TierStatusDisplayProps {
  tierName: CommunityTier;
  tierColor: string;
  tierExpiresAt?: string | null;
}

export function TierStatusDisplay({
  tierName,
  tierColor,
  tierExpiresAt,
}: TierStatusDisplayProps) {
  const showExpiry = useMemo(
    () => tierName !== CommunityTier.Unaffiliated && !!tierExpiresAt,
    [tierName, tierExpiresAt],
  );

  const expiryMonthYear = useMemo(
    () =>
      showExpiry
        ? new Date(Number(tierExpiresAt) * 1000).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })
        : null,
    [showExpiry, tierExpiresAt],
  );

  const expiryTooltip = useMemo(
    () =>
      showExpiry
        ? `${capitalize(tierName)} Partner status active until ${formatDate(tierExpiresAt!)}`
        : undefined,
    [showExpiry, tierName, tierExpiresAt],
  );

  return (
    <Stack sx={{ pl: 2 }} spacing={1}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <TierIcon tier={tierName} size={20} />
        <Typography
          component="span"
          sx={{
            fontSize: (t) => t.typography.pxToRem(13),
            fontWeight: 600,
            color: tierColor,
          }}
        >
          {capitalize(tierName)} Community
        </Typography>
      </Stack>
      {showExpiry && (
        <WithTooltip
          iconPosition="end"
          tooltip={expiryTooltip}
          sx={{
            fontSize: (t) => t.typography.pxToRem(12),
            color: "text.primary",
          }}
        >
          Valid until · {expiryMonthYear}
        </WithTooltip>
      )}
    </Stack>
  );
}
