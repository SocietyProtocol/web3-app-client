// Entity store of the subgraph fake.
//
// Two layers:
//   base     what the fake "indexed": the recorded baseline plus everything
//            the chain follower (indexer.mjs) derived from the local chain.
//            Lives as long as the stack.
//   overlay  a list of operations a test pushed (see OverlayOp in
//            e2e/support/backends/subgraph.ts). Replayed on top of the base
//            for every read, and dropped by reset() between tests.
//
// Entities are plain JSON objects shaped like the subgraph's own schema
// (web3-app-subgraph/schema.graphql): references are ids, lists of references
// are arrays of ids, BigInt values are decimal strings.

/** Fields a new entity starts with, mirroring the subgraph's findOrCreate helpers. */
export const ENTITY_DEFAULTS = {
  User: () => ({
    metadata: null,
    name: null,
    bio: null,
    imageUrl: null,
    profile: null,
    badges: [],
    protocolRoles: [],
    protocolRoleCount: 0,
    invitedBy: null,
    managedBadges: [],
    managedCommunities: [],
    communities: [],
  }),
  Badge: () => ({
    metadata: null,
    name: "",
    description: null,
    isOfficial: false,
    isCommunity: false,
    isProfile: false,
    uri: "",
    hookAddress: "0x",
    creatorAddress: "",
    createdAt: "0",
    imageUrl: null,
    createdBy: null,
    minters: [],
    burners: [],
    transferers: [],
    holdersCount: "0",
    profileUser: null,
    community: null,
    protocolRole: "NONE",
  }),
  Community: () => ({
    metadata: null,
    name: "",
    description: null,
    imageUrl: null,
    createdAt: "0",
    tierId: "0",
    tierName: "",
    tierExpiresAt: "0",
    managerAddress: "",
    manager: null,
    managerBadge: null,
    assistantBadge: null,
    memberBadge: null,
    memberCount: "0",
    badgeCount: "0",
  }),
  Metadata: () => ({ name: null, bio: null, imageUrl: null, description: null }),
};

/**
 * Fields the subgraph derives from the other side of a relation
 * (@derivedFrom). "Badge.holders" is every User whose `badges` has the badge.
 */
export const DERIVED_FIELDS = {
  "User.invitedUsers": { type: "User", field: "invitedBy" },
  "Badge.managers": { type: "User", field: "managedBadges" },
  "Badge.holders": { type: "User", field: "badges" },
  "Community.members": { type: "User", field: "communities" },
  "Community.badges": { type: "Badge", field: "community" },
  "AuctionUser.orders": { type: "Order", field: "auctionUser" },
};

function newEntity(type, id) {
  return { id, ...(ENTITY_DEFAULTS[type]?.() ?? {}) };
}

function applyOp(tables, op) {
  if (!op || typeof op !== "object" || typeof op.type !== "string" || typeof op.id !== "string") {
    throw new Error(`Invalid store operation: ${JSON.stringify(op)}`);
  }
  let table = tables.get(op.type);
  if (!table) {
    table = new Map();
    tables.set(op.type, table);
  }
  switch (op.op) {
    case "upsert": {
      const current = table.get(op.id) ?? newEntity(op.type, op.id);
      table.set(op.id, { ...current, ...(op.fields ?? {}), id: op.id });
      return;
    }
    case "delete":
      table.delete(op.id);
      return;
    case "link":
    case "unlink": {
      if (typeof op.field !== "string" || !Array.isArray(op.ids)) {
        throw new Error(`"${op.op}" needs field and ids: ${JSON.stringify(op)}`);
      }
      const current = table.get(op.id) ?? newEntity(op.type, op.id);
      const existing = Array.isArray(current[op.field]) ? current[op.field] : [];
      const next =
        op.op === "link"
          ? [...existing, ...op.ids.filter((id) => !existing.includes(id))]
          : existing.filter((id) => !op.ids.includes(id));
      table.set(op.id, { ...current, [op.field]: next });
      return;
    }
    default:
      throw new Error(`Unknown store operation "${op.op}"`);
  }
}

export class EntityStore {
  constructor() {
    /** @type {Map<string, Map<string, Record<string, unknown>>>} */
    this.base = new Map();
    this.overlay = [];
    this.cachedView = undefined;
  }

  /** Writes to the base layer (the baseline and the chain follower). */
  write(op) {
    applyOp(this.base, op);
    this.cachedView = undefined;
  }

  /** Base-layer read, for the chain follower: it must not see test overlays. */
  load(type, id) {
    const entity = this.base.get(type)?.get(id);
    return entity ? structuredClone(entity) : undefined;
  }

  save(type, entity) {
    this.write({ op: "upsert", type, id: entity.id, fields: entity });
  }

  /** Adds test operations on top of the base. Validates them first. */
  pushOverlay(ops) {
    const probe = this.cloneBase();
    for (const op of this.overlay) applyOp(probe, op);
    for (const op of ops) applyOp(probe, op);
    this.overlay.push(...ops);
    this.cachedView = probe;
  }

  resetOverlay() {
    this.overlay = [];
    this.cachedView = undefined;
  }

  cloneBase() {
    const copy = new Map();
    for (const [type, table] of this.base) {
      copy.set(type, new Map([...table].map(([id, entity]) => [id, structuredClone(entity)])));
    }
    return copy;
  }

  /** What queries see: the base with the overlay applied. */
  view() {
    if (!this.cachedView) {
      const merged = this.cloneBase();
      for (const op of this.overlay) applyOp(merged, op);
      this.cachedView = merged;
    }
    return this.cachedView;
  }

  get(type, id) {
    return this.view().get(type)?.get(id);
  }

  all(type) {
    return [...(this.view().get(type)?.values() ?? [])];
  }

  counts() {
    return Object.fromEntries([...this.view()].map(([type, table]) => [type, table.size]));
  }

  /** Serialises the base layer with stable ordering (for the baseline file). */
  dumpBase() {
    const out = {};
    for (const type of [...this.base.keys()].sort()) {
      const table = this.base.get(type);
      const ids = [...table.keys()].sort((a, b) =>
        /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : a < b ? -1 : a > b ? 1 : 0,
      );
      out[type] = ids.map((id) => table.get(id));
    }
    return out;
  }

  loadBase(entities) {
    for (const [type, list] of Object.entries(entities)) {
      for (const entity of list) this.write({ op: "upsert", type, id: entity.id, fields: entity });
    }
  }
}
