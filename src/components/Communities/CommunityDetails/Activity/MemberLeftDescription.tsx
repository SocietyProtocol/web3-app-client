import { Stack, Typography } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../../.graphclient";
import { UserHandle } from "@/components/User/UserHandle";
import { Hex } from "viem";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "MemberLeftActivity" }
>;

export function MemberLeftDescription({ event }: { event: Event }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <UserHandle
        id={event.user.id as Hex}
        name={event.user.name}
        imageUrl={event.user.imageUrl}
        size="small"
        link
        highlightYou
      />
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        left the community
      </Typography>
    </Stack>
  );
}
