/**
 * Typed builders for the subgraph fake's entities and overlay operations.
 *
 * Entities have the shape of the subgraph's own schema
 * (web3-app-subgraph/schema.graphql): a reference is the other entity's id,
 * a list of references is an array of ids, BigInt values are decimal
 * strings, addresses and user ids are lowercase. Derived fields
 * (Badge.holders, Badge.managers, Community.members, Community.badges,
 * User.invitedUsers) are never stored: the fake computes them from the
 * other side, so "user U holds badge B" is `link("User", U, "badges", [B])`.
 *
 * A builder returns one overlay operation. Pass any number of them to
 * `subgraph.overlay(...)`; they apply on top of the baseline for the rest of
 * the test and are dropped before the next one.
 */
export type ProtocolRole = "NONE" | "GOVERNOR" | "CONTRIBUTOR" | "CORE_TEAM" | "ADVISOR" | "MODERATOR";

export type MetadataEntity = {
  id: string;
  name: string | null;
  bio: string | null;
  imageUrl: string | null;
  description: string | null;
};

export type UserEntity = {
  id: string;
  metadata: string | null;
  name: string | null;
  bio: string | null;
  imageUrl: string | null;
  profile: string | null;
  badges: string[];
  protocolRoles: ProtocolRole[];
  protocolRoleCount: number;
  invitedBy: string | null;
  managedBadges: string[];
  managedCommunities: string[];
  communities: string[];
};

export type BadgeEntity = {
  id: string;
  metadata: string | null;
  name: string;
  description: string | null;
  isOfficial: boolean;
  isCommunity: boolean;
  isProfile: boolean;
  uri: string;
  hookAddress: string;
  creatorAddress: string;
  createdAt: string;
  imageUrl: string | null;
  createdBy: string | null;
  minters: string[];
  burners: string[];
  transferers: string[];
  holdersCount: string;
  profileUser: string | null;
  community: string | null;
  protocolRole: ProtocolRole;
};

export type CommunityEntity = {
  id: string;
  metadata: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  tierId: string;
  tierName: string;
  tierExpiresAt: string;
  managerAddress: string;
  manager: string | null;
  managerBadge: string | null;
  assistantBadge: string | null;
  memberBadge: string | null;
  memberCount: string;
  badgeCount: string;
};

export type EntityTypes = {
  User: UserEntity;
  Badge: BadgeEntity;
  Community: CommunityEntity;
  Metadata: MetadataEntity;
};

export type OverlayOp =
  | { op: "upsert"; type: string; id: string; fields: Record<string, unknown> }
  | { op: "delete"; type: string; id: string }
  | { op: "link" | "unlink"; type: string; id: string; field: string; ids: string[] };

type Fields<T> = Partial<Omit<T, "id">>;

const lower = (id: string) => (id.startsWith("0x") ? id.toLowerCase() : id);

/**
 * Creates the entity, or changes the given fields of an existing one.
 * Fields left out keep their value (or the subgraph's default for a new
 * entity). Works for any entity type of the schema.
 */
export function upsert<K extends keyof EntityTypes>(type: K, id: string, fields?: Fields<EntityTypes[K]>): OverlayOp;
export function upsert(type: string, id: string, fields?: Record<string, unknown>): OverlayOp;
export function upsert(type: string, id: string, fields: Record<string, unknown> = {}): OverlayOp {
  return { op: "upsert", type, id: lower(id), fields };
}

/** Creates the user, or changes fields of an existing one. */
export const user = (address: string, fields: Fields<UserEntity> = {}) => upsert("User", address, fields);
/** Changes fields of an existing badge. For a badge that is not on chain, use newBadge(). */
export const badge = (id: string | bigint, fields: Fields<BadgeEntity> = {}) => upsert("Badge", String(id), fields);
/** Changes fields of an existing community. For a new one, use newCommunity(). */
export const community = (id: string | bigint, fields: Fields<CommunityEntity> = {}) =>
  upsert("Community", String(id), fields);
export const metadata = (id: string, fields: Fields<MetadataEntity> = {}) => upsert("Metadata", id, fields);

/**
 * A badge that exists only in the fake. The schema requires a creator
 * (Badge.createdBy is non-null), so the creator's User entity is made too.
 */
export function newBadge(input: {
  id: string | bigint;
  name: string;
  createdBy: string;
  fields?: Fields<BadgeEntity>;
}): OverlayOp[] {
  const creator = input.createdBy.toLowerCase();
  return [
    user(creator),
    badge(input.id, { name: input.name, createdBy: creator, creatorAddress: creator, ...input.fields }),
  ];
}

/**
 * A community that exists only in the fake. The schema requires a manager
 * and a manager badge (both non-null), so those entities are made too.
 */
export function newCommunity(input: {
  id: string | bigint;
  name: string;
  manager: string;
  managerBadgeId: string | bigint;
  fields?: Fields<CommunityEntity>;
}): OverlayOp[] {
  const manager = input.manager.toLowerCase();
  const communityId = String(input.id);
  const managerBadge = String(input.managerBadgeId);
  return [
    ...newBadge({
      id: managerBadge,
      name: `${input.name} Manager`,
      createdBy: manager,
      fields: { isCommunity: true, community: communityId, holdersCount: "1" },
    }),
    community(communityId, {
      name: input.name,
      manager,
      managerAddress: manager,
      managerBadge,
      ...input.fields,
    }),
    link("User", manager, "badges", [managerBadge]),
    link("User", manager, "managedCommunities", [communityId]),
  ];
}

/** Removes the entity from what queries see. */
export const remove = (type: string, id: string): OverlayOp => ({ op: "delete", type, id: lower(id) });

/** Adds ids to a list-of-references field, e.g. link("User", holder, "badges", ["69"]). */
export const link = (type: string, id: string, field: string, ids: string[]): OverlayOp => ({
  op: "link",
  type,
  id: lower(id),
  field,
  ids: ids.map(lower),
});

export const unlink = (type: string, id: string, field: string, ids: string[]): OverlayOp => ({
  op: "unlink",
  type,
  id: lower(id),
  field,
  ids: ids.map(lower),
});

/**
 * A user with a profile whose name the UI will show: the user, the profile
 * badge and the metadata the name comes from. Rendering only: this writes
 * nothing on chain (use a persona for a member that exists on chain too).
 */
export function memberWithProfile(input: {
  address: string;
  profileBadgeId: string | bigint;
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
}): OverlayOp[] {
  const address = input.address.toLowerCase();
  const badgeId = String(input.profileBadgeId);
  const metadataId = `e2e-profile-${badgeId}`;
  return [
    metadata(metadataId, { name: input.name, bio: input.bio ?? null, imageUrl: input.imageUrl ?? null }),
    badge(badgeId, {
      name: "Profile",
      isProfile: true,
      profileUser: address,
      createdBy: address,
      creatorAddress: address,
      metadata: metadataId,
      holdersCount: "1",
    }),
    user(address, { profile: badgeId, metadata: metadataId }),
    link("User", address, "badges", [badgeId]),
  ];
}
