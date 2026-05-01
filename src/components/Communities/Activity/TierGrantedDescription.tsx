import { capitalize, Stack, Typography, useTheme } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../.graphclient";
import { TierIcon } from "@/components/Communities/Tier/TierIcon";
import { CommunityTier } from "@/data/communities/types";
import { getTierColor } from "@/components/Communities/utils";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "CommunityTierGrantedActivity" }
>;

export function TierGrantedDescription({ event }: { event: Event }) {
  const theme = useTheme();
  const tier = event.tierName as CommunityTier;

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <TierIcon tier={tier} size={16} />
      <Typography
        variant="body2"
        sx={{ color: getTierColor(theme, tier), fontSize: 12 }}
      >
        {capitalize(event.tierName)} tier granted
      </Typography>
    </Stack>
  );
}
