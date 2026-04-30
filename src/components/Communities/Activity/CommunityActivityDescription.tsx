"use client";

import { CommunityActivitiesQuery } from "../../../../.graphclient";
import { MemberJoinedDescription } from "./MemberJoinedDescription";
import { MemberLeftDescription } from "./MemberLeftDescription";
import { BadgeMintedDescription } from "./BadgeMintedDescription";
import { MemberTransferredDescription } from "./MemberTransferredDescription";
import { ManagerChangedDescription } from "./ManagerChangedDescription";
import { BadgeLinkedDescription } from "./BadgeLinkedDescription";
import { BadgeBurnedDescription } from "./BadgeBurnedDescription";
import { TierGrantedDescription } from "./TierGrantedDescription";
import { TierRevokedDescription } from "./TierRevokedDescription";
import { SimpleDescription } from "./SimpleDescription";

type ActivityEvent =
  CommunityActivitiesQuery["communityActivityEvents"][number];

interface CommunityActivityDescriptionProps {
  event: ActivityEvent;
}

export function CommunityActivityDescription({
  event,
}: CommunityActivityDescriptionProps) {
  switch (event.__typename) {
    case "MemberJoinedActivity":
      return <MemberJoinedDescription event={event} />;
    case "MemberLeftActivity":
      return <MemberLeftDescription event={event} />;
    case "BadgeMintedActivity":
      return <BadgeMintedDescription event={event} />;
    case "MemberTransferredActivity":
      return <MemberTransferredDescription event={event} />;
    case "ManagerChangedActivity":
      return <ManagerChangedDescription event={event} />;
    case "CommunityBadgeLinkedActivity":
      return <BadgeLinkedDescription event={event} />;
    case "BadgeBurnedActivity":
      return <BadgeBurnedDescription event={event} />;
    case "CommunityTierGrantedActivity":
      return <TierGrantedDescription event={event} />;
    case "CommunityTierRevokedActivity":
      return <TierRevokedDescription event={event} />;
    case "CommunityCreatedActivity":
      return <SimpleDescription label="Community created" />;
    case "CommunityDetailsUpdatedActivity":
      return <SimpleDescription label="Community details updated" />;
    default:
      return <SimpleDescription label="Activity recorded" />;
  }
}
