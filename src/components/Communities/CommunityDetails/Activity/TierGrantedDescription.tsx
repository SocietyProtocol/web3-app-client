import { capitalize, Stack, Typography } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../.graphclient";
import { TierIcon } from "@/components/Communities/Tier/TierIcon";
import { CommunityTier } from "@/data/communities/types";
import { getTierColor } from "@/components/Communities/utils";
import { LiveRelativeTime } from "@/components/Common/LiveRelativeTime";
import { useNow } from "@/hooks/useNow";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "CommunityTierGrantedActivity" }
>;

export function TierGrantedDescription({ event }: { event: Event }) {
  const now = useNow();
  const tier = event.tierName as CommunityTier;
  const isExpired = event.tierExpiresAt && Number(event.tierExpiresAt) < now;

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <TierIcon tier={tier} size={16} />
      <Typography
        variant="body2"
        sx={{
          color: (theme) => getTierColor(theme, tier),
          fontSize: (theme) => theme.typography.pxToRem(12),
        }}
      >
        {capitalize(event.tierName)} tier granted
      </Typography>
      {event.tierExpiresAt && (
        <>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontSize: (theme) => theme.typography.pxToRem(12),
            }}
          >
            · {isExpired ? "expired" : "expires"}
          </Typography>
          <LiveRelativeTime
            timestamp={event.tierExpiresAt}
            sx={{
              color: "text.secondary",
              fontSize: (theme) => theme.typography.pxToRem(12),
            }}
          />
        </>
      )}
    </Stack>
  );
}
