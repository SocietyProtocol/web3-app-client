// A small chain follower for the subgraph fake.
//
// It reads the badges contract's logs and applies them to the entity store
// the way the real subgraph's mappings do (web3-app-subgraph,
// src/society-protocol-badges.ts). Two uses:
//   - recording the baseline: replay history up to the fork block;
//   - during a run: follow the local chain, so a write a test (or a persona
//     seed) makes on chain shows up in the next query, and `_meta` only
//     reports a block once its logs are applied.
//
// This is an imitation written for tests. It proves that the UI renders the
// state a write should produce, NOT that the real subgraph indexes it: that
// is the job of the live layer. Not covered: CommunityRegistry, the auction,
// the VIP manager (Lock SPEC) and community activities. Seed those with
// overlays (e2e/support/builders) until someone adds handlers here.
import { decodeEventLog, encodeFunctionData, decodeFunctionResult, parseAbi } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const BADGES_EVENTS = parseAbi([
  "event BadgeCreated(uint256 indexed id, string name, bool isOfficial, bool isCommunityBadge, address indexed creator)",
  "event BadgeModified(uint256 indexed id, string name, bool isOfficial, bool isCommunityBadge, string metadataURI)",
  "event BadgePermissions(uint256 indexed id, uint256[] minters, uint256[] transferers, uint256[] burners, address[] editors)",
  "event EditorsUpdated(uint256 indexed id, address indexed editor, bool isAllowed)",
  "event HookUpdated(uint256 indexed id, address indexed hook)",
  "event ProfileCreated(address indexed user, uint256 indexed id)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event URI(string value, uint256 indexed id)",
  "event UserInvited(address indexed inviter, address indexed invitee, uint256 nonce)",
]);

const BADGES_VIEWS = parseAbi([
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
]);

const ROLE_BY_NAME = {
  Governor: "GOVERNOR",
  Contributor: "CONTRIBUTOR",
  "Core Team": "CORE_TEAM",
  Advisor: "ADVISOR",
  Moderator: "MODERATOR",
};

/**
 * The Metadata entity id for a token URI: the CID (and path) after /ipfs/,
 * or undefined when the URI is not an IPFS reference the subgraph accepts.
 */
export function metadataIdentifier(uri) {
  if (typeof uri !== "string" || !uri) return undefined;
  const clean = uri.split("?", 1)[0].split("#", 1)[0];
  let identifier;
  if (clean.startsWith("ipfs://")) identifier = clean.slice(7);
  else {
    const marker = clean.indexOf("/ipfs/");
    if (marker < 0 || !/^https?:\/\//.test(clean)) return undefined;
    identifier = clean.slice(marker + 6);
  }
  const root = identifier.split("/")[0];
  const cidV1 = /^baf[yk]rei[a-z2-7]{52}$/.test(root);
  const cidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(root);
  if (!cidV1 && !cidV0) return undefined;
  if (identifier.endsWith("/") || identifier.includes("%")) return undefined;
  return identifier;
}

export function createIndexer({ store, rpc, badgesAddress }) {
  const blockTimestamps = new Map();

  async function blockTimestamp(blockNumberHex) {
    if (!blockTimestamps.has(blockNumberHex)) {
      const block = await rpc("eth_getBlockByNumber", [blockNumberHex, false]);
      blockTimestamps.set(blockNumberHex, BigInt(block.timestamp).toString());
    }
    return blockTimestamps.get(blockNumberHex);
  }

  async function call(functionName, args, blockNumberHex) {
    try {
      const data = encodeFunctionData({ abi: BADGES_VIEWS, functionName, args });
      const result = await rpc("eth_call", [{ to: badgesAddress, data }, blockNumberHex]);
      return decodeFunctionResult({ abi: BADGES_VIEWS, functionName, data: result });
    } catch {
      return undefined; // the mappings use try_ calls: a revert is "no value"
    }
  }

  /** The sender of the log's transaction (event.transaction.from in the mappings). */
  async function transactionFrom(log) {
    const transaction = await rpc("eth_getTransactionByHash", [log.transactionHash]);
    return (transaction?.from ?? ZERO_ADDRESS).toLowerCase();
  }

  function findOrCreateUser(id) {
    let user = store.load("User", id);
    if (!user) {
      store.write({ op: "upsert", type: "User", id, fields: {} });
      user = store.load("User", id);
    }
    return user;
  }

  function findOrCreateBadge(id, creator) {
    let badge = store.load("Badge", id);
    if (!badge) {
      const createdBy = findOrCreateUser(creator);
      store.write({
        op: "upsert",
        type: "Badge",
        id,
        fields: { creatorAddress: creator, createdBy: createdBy.id },
      });
      badge = store.load("Badge", id);
    }
    return badge;
  }

  function rebuildProtocolRoles(user) {
    const roles = [];
    for (const badgeId of user.badges) {
      const role = store.load("Badge", badgeId)?.protocolRole;
      if (role && role !== "NONE" && !roles.includes(role)) roles.push(role);
    }
    user.protocolRoles = roles;
    user.protocolRoleCount = roles.length;
  }

  function mint(badgeId, to) {
    const badge = store.load("Badge", badgeId);
    const user = findOrCreateUser(to);
    if (!badge || user.badges.includes(badge.id)) return;
    user.badges.push(badge.id);
    rebuildProtocolRoles(user);
    store.save("User", user);
    badge.holdersCount = (BigInt(badge.holdersCount) + 1n).toString();
    store.save("Badge", badge);
  }

  async function burn(badgeId, from, blockNumberHex) {
    const badge = store.load("Badge", badgeId);
    const user = findOrCreateUser(from);
    if (!badge) return;
    const index = user.badges.indexOf(badge.id);
    if (index < 0) return;
    // ERC-1155: another copy may remain, and then the holder stays.
    const balance = await call("balanceOf", [from, BigInt(badgeId)], blockNumberHex);
    if (balance !== undefined && balance > 0n) return;
    user.badges.splice(index, 1);
    rebuildProtocolRoles(user);
    store.save("User", user);
    badge.holdersCount = (BigInt(badge.holdersCount) - 1n).toString();
    store.save("Badge", badge);
  }

  async function transferOne(badgeId, from, to, blockNumberHex) {
    if (from === ZERO_ADDRESS) mint(badgeId, to);
    else if (to === ZERO_ADDRESS) await burn(badgeId, from, blockNumberHex);
    else {
      await burn(badgeId, from, blockNumberHex);
      mint(badgeId, to);
    }
  }

  function setUri(badge, uri) {
    badge.uri = uri ?? "";
    badge.metadata = metadataIdentifier(badge.uri) ?? null;
    badge.imageUrl = null;
    badge.description = null;
  }

  const handlers = {
    async BadgeCreated(args, log) {
      const creator = args.creator.toLowerCase();
      const id = args.id.toString();
      const badge = findOrCreateBadge(id, creator);
      badge.creatorAddress = creator;
      badge.createdBy = findOrCreateUser(creator).id;
      badge.name = args.name;
      badge.isOfficial = args.isOfficial;
      badge.isCommunity = args.isCommunityBadge;
      badge.isProfile = false;
      badge.protocolRole = ROLE_BY_NAME[badge.name] ?? "NONE";
      badge.hookAddress = "0x";
      badge.createdAt = await blockTimestamp(log.blockNumber);
      setUri(badge, await call("uri", [args.id], log.blockNumber));
      store.save("Badge", badge);
    },
    async BadgeModified(args) {
      const badge = store.load("Badge", args.id.toString());
      if (!badge) return;
      badge.name = args.name;
      badge.isOfficial = args.isOfficial;
      badge.isCommunity = args.isCommunityBadge;
      badge.protocolRole = ROLE_BY_NAME[badge.name] ?? "NONE";
      setUri(badge, args.metadataURI);
      store.save("Badge", badge);
    },
    async HookUpdated(args) {
      const badge = store.load("Badge", args.id.toString());
      if (!badge) return;
      badge.hookAddress = args.hook.toLowerCase();
      store.save("Badge", badge);
    },
    async ProfileCreated(args) {
      const user = findOrCreateUser(args.user.toLowerCase());
      const badge = store.load("Badge", args.id.toString());
      if (!badge) return;
      user.profile = badge.id;
      user.metadata = badge.metadata;
      user.name = null;
      user.bio = null;
      user.imageUrl = null;
      store.save("User", user);
      badge.isProfile = true;
      badge.profileUser = user.id;
      store.save("Badge", badge);
    },
    async URI(args) {
      const badge = store.load("Badge", args.id.toString());
      if (!badge) return;
      setUri(badge, args.value);
      store.save("Badge", badge);
      if (badge.isProfile && badge.profileUser) {
        const user = store.load("User", badge.profileUser);
        if (user) {
          user.metadata = badge.metadata;
          user.name = null;
          user.bio = null;
          user.imageUrl = null;
          store.save("User", user);
        }
      }
    },
    async TransferSingle(args, log) {
      await transferOne(args.id.toString(), args.from.toLowerCase(), args.to.toLowerCase(), log.blockNumber);
    },
    async TransferBatch(args, log) {
      for (const id of args.ids) {
        await transferOne(id.toString(), args.from.toLowerCase(), args.to.toLowerCase(), log.blockNumber);
      }
    },
    async EditorsUpdated(args, log) {
      const id = args.id.toString();
      const badge = store.load("Badge", id) ?? findOrCreateBadge(id, await transactionFrom(log));
      const manager = findOrCreateUser(args.editor.toLowerCase());
      const index = manager.managedBadges.indexOf(badge.id);
      if (args.isAllowed && index < 0) manager.managedBadges.push(badge.id);
      else if (!args.isAllowed && index >= 0) manager.managedBadges.splice(index, 1);
      else return;
      store.save("User", manager);
    },
    async BadgePermissions(args, log) {
      const id = args.id.toString();
      const badge = store.load("Badge", id) ?? findOrCreateBadge(id, await transactionFrom(log));
      badge.minters = args.minters.map(String);
      badge.burners = args.burners.map(String);
      badge.transferers = args.transferers.map(String);
      store.save("Badge", badge);
    },
    async UserInvited(args) {
      const inviter = findOrCreateUser(args.inviter.toLowerCase());
      const invitee = findOrCreateUser(args.invitee.toLowerCase());
      invitee.invitedBy = inviter.id;
      store.save("User", invitee);
    },
  };

  async function applyLog(log) {
    let decoded;
    try {
      decoded = decodeEventLog({ abi: BADGES_EVENTS, data: log.data, topics: log.topics });
    } catch {
      return false; // an event the subgraph has no handler for
    }
    await handlers[decoded.eventName](decoded.args, log);
    return true;
  }

  const order = (left, right) =>
    Number(BigInt(left.blockNumber) - BigInt(right.blockNumber)) ||
    Number(BigInt(left.logIndex) - BigInt(right.logIndex));

  return {
    /** Applies the contract's logs in [fromBlock, toBlock]; returns how many it handled. */
    async indexRange(fromBlock, toBlock) {
      if (toBlock < fromBlock) return 0;
      const logs = await rpc("eth_getLogs", [
        {
          address: badgesAddress,
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
        },
      ]);
      let handled = 0;
      for (const log of [...logs].sort(order)) {
        if (await applyLog(log)) handled += 1;
      }
      return handled;
    },
  };
}
