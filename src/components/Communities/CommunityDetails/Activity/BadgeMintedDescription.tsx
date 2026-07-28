import { Stack, Typography } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../../.graphclient";
import { UserHandle } from "@/components/User/UserHandle";
import { BadgeHandle } from "@/components/Badges/BadgeHandle";
import { Hex } from "viem";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "BadgeMintedActivity" }
>;

export function BadgeMintedDescription({ event }: { event: Event }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        Badge
      </Typography>
      <BadgeHandle id={event.badge.id} name={event.badge.name} link />
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        minted to
      </Typography>
      <UserHandle
        id={event.user.id as Hex}
        name={event.user.name}
        imageUrl={event.user.imageUrl}
        size="small"
        link
        highlightYou
      />
    </Stack>
  );
}
