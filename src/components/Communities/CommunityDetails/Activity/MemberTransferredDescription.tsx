import { Stack, Typography } from "@mui/material";
import { CommunityActivitiesQuery } from "../../../../.graphclient";
import { UserHandle } from "@/components/User/UserHandle";
import { Hex } from "viem";

type Event = Extract<
  CommunityActivitiesQuery["communityActivityEvents"][number],
  { __typename: "MemberTransferredActivity" }
>;

export function MemberTransferredDescription({ event }: { event: Event }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        Membership transferred from
      </Typography>
      <UserHandle
        id={event.fromUser.id as Hex}
        name={event.fromUser.name}
        imageUrl={event.fromUser.imageUrl}
        size="small"
        link
        highlightYou
      />
      <Typography variant="body2" color="text.primary" sx={{ fontSize: 12 }}>
        to
      </Typography>
      <UserHandle
        id={event.toUser.id as Hex}
        name={event.toUser.name}
        imageUrl={event.toUser.imageUrl}
        size="small"
        link
        highlightYou
      />
    </Stack>
  );
}
