/**
 * Overlay builders for communities, their members and their activity feed.
 *
 * The subgraph fake does not follow the CommunityRegistry (see "The subgraph
 * fake" in e2e/README.md), so everything a community page reads from the
 * subgraph is seeded here. The shapes mirror what the real subgraph writes
 * (web3-app-subgraph, src/community-registry.ts, src/vip-manager.ts and
 * src/utils/community-membership.ts):
 *
 *   - the community id is also the id of its manager badge;
 *   - a tier is `tierId` 1 (bronze), 2 (silver), 3 (gold) with `tierName` and
 *     an expiry in seconds; no tier is tierId 0, tierName "unaffiliated",
 *     expiry 0;
 *   - a member is three things: the community's id in `User.communities`
 *     (what "My Communities" filters on), a CommunityMembership (what the
 *     Members tab lists) and the MemberJoinedActivity it points at;
 *   - `memberCount` is a stored number, not derived: set it yourself.
 *
 * These are rendering only. Nothing here exists on chain; for a community a
 * test writes to, use community-detail-seed.ts.
 */
import { badge, community, link, newBadge, newCommunity, upsert, user, type CommunityEntity, type OverlayOp } from "./entities";

export type Tier = "gold" | "silver" | "bronze" | "unaffiliated";

/** Tier ids as the VIP manager and the subgraph use them. */
export const TIER_ID: Record<Tier, string> = { unaffiliated: "0", bronze: "1", silver: "2", gold: "3" };

const DAY = 24 * 60 * 60;

export const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * The three tier fields of a community. A paid tier runs for another 180
 * days unless `expiresAt` (seconds) says otherwise; pass a time in the past
 * for a tier that has run out, which the app shows as unaffiliated.
 */
export function tierFields(
  tier: Tier,
  expiresAt?: number,
): Pick<CommunityEntity, "tierId" | "tierName" | "tierExpiresAt"> {
  if (tier === "unaffiliated") return { tierId: "0", tierName: "unaffiliated", tierExpiresAt: "0" };
  return { tierId: TIER_ID[tier], tierName: tier, tierExpiresAt: String(expiresAt ?? nowInSeconds() + 180 * DAY) };
}

/**
 * An address that belongs to nobody, for users that exist only in the fake.
 * The same `n` gives the same address.
 */
export function fakeAddress(n: number): string {
  return `0x${"0".repeat(24)}e2e0${n.toString(16).padStart(12, "0")}`;
}

/** A 32-byte hash that belongs to no transaction. */
export function fakeTxHash(n: number): string {
  return `0x${"e2e0".padEnd(52, "0")}${n.toString(16).padStart(12, "0")}`;
}

/**
 * A community that exists only in the fake, with its manager, and its
 * manager badge under the community's own id, as on chain. Give it ids that
 * no badge on the fork has (9,000,000 and up).
 */
export function listedCommunity(input: {
  id: string | bigint | number;
  name: string;
  /** The manager's address; a fake one when left out. */
  manager?: string;
  tier?: Tier;
  /** Expiry of the tier in seconds; see tierFields(). */
  tierExpiresAt?: number;
  description?: string | null;
  memberCount?: number;
  /** Seconds. */
  createdAt?: number;
}): OverlayOp[] {
  const id = String(input.id);
  return newCommunity({
    id,
    name: input.name,
    manager: input.manager ?? fakeAddress(Number(id) % 1_000_000),
    managerBadgeId: id,
    fields: {
      description: input.description ?? null,
      createdAt: String(input.createdAt ?? nowInSeconds() - DAY),
      memberCount: String(input.memberCount ?? 0),
      badgeCount: "1",
      ...tierFields(input.tier ?? "unaffiliated", input.tierExpiresAt),
    },
  });
}

/**
 * The assistant and the member badge of a community that exists only in
 * the fake, named as the registry names them, and linked to the community.
 */
export function communityRoleBadges(input: {
  communityId: string | bigint | number;
  communityName: string;
  manager: string;
  assistantBadgeId: string | bigint | number;
  memberBadgeId: string | bigint | number;
}): OverlayOp[] {
  const communityId = String(input.communityId);
  const assistant = String(input.assistantBadgeId);
  const member = String(input.memberBadgeId);
  return [
    ...newBadge({
      id: assistant,
      name: `${input.communityName} Assistant`,
      createdBy: input.manager,
      fields: { isCommunity: true, community: communityId },
    }),
    ...newBadge({
      id: member,
      name: `${input.communityName} Member`,
      createdBy: input.manager,
      fields: { isCommunity: true, community: communityId },
    }),
    community(communityId, { assistantBadge: assistant, memberBadge: member, badgeCount: "3" }),
  ];
}

export const membershipId = (communityId: string | bigint | number, address: string) =>
  `${communityId}-${address.toLowerCase()}`;

const joinActivityId = (communityId: string | bigint | number, address: string) =>
  `e2e-join-${communityId}-${address.toLowerCase()}`;

/**
 * Makes `address` a member of the community as the subgraph records it:
 * the user (named `name` when given), the community in the user's
 * `communities`, the membership and its "joined" activity. `badgeId` is the
 * badge the activity names; the pages never read it, but the schema wants a
 * badge that exists (the community's member badge, or its manager badge).
 * Does not change `Community.memberCount`.
 */
export function communityMember(input: {
  communityId: string | bigint | number;
  address: string;
  badgeId: string | bigint | number;
  name?: string;
  /** Seconds. */
  joinedAt: number;
  txHash?: string;
}): OverlayOp[] {
  const communityId = String(input.communityId);
  const address = input.address.toLowerCase();
  const activity = joinActivityId(communityId, address);
  return [
    user(address, input.name === undefined ? {} : { name: input.name }),
    link("User", address, "communities", [communityId]),
    upsert("MemberJoinedActivity", activity, {
      community: communityId,
      user: address,
      badge: String(input.badgeId),
      timestamp: String(input.joinedAt),
      blockNumber: "1",
      txHash: input.txHash ?? fakeTxHash(input.joinedAt % 1_000_000),
    }),
    upsert("CommunityMembership", membershipId(communityId, address), {
      community: communityId,
      user: address,
      joinActivity: activity,
    }),
  ];
}

/** Undoes communityMember(): the membership, its activity and the user's link to the community. */
export function removeCommunityMember(communityId: string | bigint | number, address: string): OverlayOp[] {
  const id = String(communityId);
  return [
    { op: "delete", type: "CommunityMembership", id: membershipId(id, address) },
    { op: "delete", type: "MemberJoinedActivity", id: joinActivityId(id, address) },
    { op: "unlink", type: "User", id: address.toLowerCase(), field: "communities", ids: [id] },
  ];
}

/** The entity types of the community activity feed. */
export type ActivityType =
  | "MemberJoinedActivity"
  | "MemberLeftActivity"
  | "BadgeMintedActivity"
  | "BadgeBurnedActivity"
  | "MemberTransferredActivity"
  | "ManagerChangedActivity"
  | "CommunityBadgeLinkedActivity"
  | "CommunityTierGrantedActivity"
  | "CommunityTierRevokedActivity"
  | "CommunityCreatedActivity"
  | "CommunityDetailsUpdatedActivity";

/**
 * One entry of a community's activity feed. `fields` are the type's own
 * fields as the schema names them (user, badge, fromUser, toUser,
 * fromManager, toManager, creator, tierId, tierName, tierExpiresAt,
 * previousTierId, previousTierName): references are ids of entities that
 * exist. The feed is ordered by `timestamp` (seconds), newest first.
 */
export function communityActivity(input: {
  type: ActivityType;
  id: string;
  communityId: string | bigint | number;
  timestamp: number;
  txHash: string;
  fields?: Record<string, string>;
}): OverlayOp {
  return upsert(input.type, input.id, {
    community: String(input.communityId),
    timestamp: String(input.timestamp),
    blockNumber: "1",
    txHash: input.txHash,
    ...input.fields,
  });
}

/** Takes the badge out of its community's badge list (Community.badges is derived from Badge.community). */
export const withoutCommunity = (badgeId: string | bigint | number): OverlayOp =>
  badge(String(badgeId), { community: null });
