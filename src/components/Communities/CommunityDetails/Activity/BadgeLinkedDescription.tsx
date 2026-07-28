import { Stack, Typography } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../../.graphclient";
import { BadgeHandle } from "@/components/Badges/BadgeHandle";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "CommunityBadgeLinkedActivity" }
>;

export function BadgeLinkedDescription({ event }: { event: Event }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        Badge created:
      </Typography>
      <BadgeHandle id={event.badge.id} name={event.badge.name} link />
    </Stack>
  );
}
