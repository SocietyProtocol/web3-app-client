import { Stack, Typography } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../../.graphclient";
import { UserHandle } from "@/components/User/UserHandle";
import { Hex } from "viem";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "ManagerChangedActivity" }
>;

export function ManagerChangedDescription({ event }: { event: Event }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        Manager changed from
      </Typography>
      <UserHandle
        id={event.fromManager.id as Hex}
        name={event.fromManager.name}
        imageUrl={event.fromManager.imageUrl}
        size="small"
        link
        highlightYou
      />
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        to
      </Typography>
      <UserHandle
        id={event.toManager.id as Hex}
        name={event.toManager.name}
        imageUrl={event.toManager.imageUrl}
        size="small"
        link
        highlightYou
      />
    </Stack>
  );
}
