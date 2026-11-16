/**
 * A community that exists on the local chain AND in the subgraph fake, for
 * the tests that write to one (revoke, mint, edit info, edit badge,
 * transfer ownership).
 *
 * The chain part is real: `createCommunity` on the CommunityRegistry, sent
 * as the manager (impersonated), which creates the manager, assistant and
 * member badges on the badges contract and mints the manager badge and one
 * member badge to the manager. The fake follows the badges contract, so
 * those three badges, their permissions and their holders are in its
 * answers by themselves.
 *
 * The community part is an overlay: the fake has no handlers for the
 * registry, so the Community entity, the badges' link to it and the
 * memberships are pushed here, shaped as the real subgraph writes them
 * (web3-app-subgraph, src/community-registry.ts). An overlay lasts for one
 * test. After a write the test makes through the page, the fake's Community
 * and memberships do NOT change by themselves: see `indexAfter` in
 * e2e/features/community-detail/steps.ts.
 *
 * Facts of the contract this relies on (web3-app-contracts,
 * contracts/Accounts/CommunityRegistry.sol):
 *   - anyone may create a community; its id is the manager badge's id;
 *   - whoever holds the manager badge is the manager (`onlyManager`);
 *   - assistant badge: minted and burned by the manager badge's holder;
 *   - member badge: minted and burned by holders of the manager or the
 *     assistant badge; neither badge can be transferred;
 *   - manager badge: only its holder can transfer it (PERM_SELF).
 */
import { encodeFunctionData, isAddressEqual, parseEventLogs, type Address, type TransactionReceipt } from "viem";
import { CommunityRegistryAbi } from "../../../src/abis/CommunityRegistry";
import { COMMUNITY_REGISTRY_ADDRESS } from "../../env/hermetic";
import type { S3Fake } from "../backends/s3";
import type { SubgraphFake } from "../backends/subgraph";
import type { Chain } from "../chain/chain";
import { communityMember, tierFields, type Tier } from "./communities-entities";
import { badge, community, link, user, type OverlayOp } from "./entities";

export type SeedDeps = { chain: Chain; s3: S3Fake; subgraph: SubgraphFake };

export type SeededCommunity = {
  /** The community's id, which is also the id of its manager badge. */
  id: bigint;
  name: string;
  description: string;
  /** The account that holds the manager badge. */
  manager: Address;
  managerBadgeId: bigint;
  assistantBadgeId: bigint;
  memberBadgeId: bigint;
  /** Block time of the creation, in seconds. */
  createdAt: number;
  /** Metadata URIs of the three badges, as given to createCommunity. */
  uris: { manager: string; assistant: string; member: string };
  /** What the member badge's metadata holds besides `imageUrl`. */
  memberBadgeMetadata: Record<string, unknown>;
  /** `Community.memberCount` as the overlay last set it. addMember() counts it up. */
  memberCount: number;
};

/** The registry's record of a community, read from the chain. */
export function readCommunityOnChain(chain: Chain, communityId: bigint) {
  return chain.public.readContract({
    address: COMMUNITY_REGISTRY_ADDRESS,
    abi: CommunityRegistryAbi,
    functionName: "getCommunityDetails",
    args: [communityId],
  });
}

async function blockTime(chain: Chain, receipt: TransactionReceipt): Promise<number> {
  const block = await chain.public.getBlock({ blockNumber: receipt.blockNumber });
  return Number(block.timestamp);
}

/**
 * What the real subgraph holds for a community right after `createCommunity`
 * (handleCommunityCreated): the Community with its three badges, the
 * badges' link to it, and the creator as its manager and first member. The
 * three badges themselves must already be in the fake (it follows the
 * badges contract: `await subgraph.sync()` after the transaction).
 */
export function communityAsIndexed(input: {
  id: bigint;
  name: string;
  description: string;
  manager: Address;
  assistantBadgeId: bigint;
  memberBadgeId: bigint;
  /** Seconds. */
  createdAt: number;
  txHash: string;
  tier?: Tier;
  tierExpiresAt?: number;
}): OverlayOp[] {
  const id = input.id.toString();
  const manager = input.manager.toLowerCase();
  return [
    user(manager),
    community(id, {
      name: input.name,
      description: input.description,
      createdAt: String(input.createdAt),
      manager,
      managerAddress: manager,
      managerBadge: id,
      assistantBadge: input.assistantBadgeId.toString(),
      memberBadge: input.memberBadgeId.toString(),
      memberCount: "1",
      badgeCount: "3",
      ...tierFields(input.tier ?? "unaffiliated", input.tierExpiresAt),
    }),
    badge(id, { community: id }),
    badge(input.assistantBadgeId, { community: id }),
    badge(input.memberBadgeId, { community: id }),
    link("User", manager, "managedCommunities", [id]),
    ...communityMember({
      communityId: id,
      address: manager,
      badgeId: input.memberBadgeId,
      joinedAt: input.createdAt,
      txHash: input.txHash,
    }),
  ];
}

/**
 * Creates a community on chain as `manager` and makes the fake list it.
 * `manager` is the account that will hold the manager badge: a persona's
 * Society address, or its owner wallet for a community "from before the
 * migration". The manager is the community's first member.
 */
export async function seedCommunity(
  deps: SeedDeps,
  input: {
    manager: Address;
    name?: string;
    description?: string;
    tier?: Tier;
    /** Expiry of the tier in seconds; 180 days from now when left out. */
    tierExpiresAt?: number;
  },
): Promise<SeededCommunity> {
  const { chain, s3, subgraph } = deps;
  const name = input.name ?? `E2E Community ${input.manager.slice(2, 8).toLowerCase()}`;
  const description = input.description ?? "A community made for one browser test.";
  const memberBadgeMetadata = { description: `Member of ${name}` };

  // The same shape the wizard pins: the badge's own metadata plus imageUrl.
  const [managerMeta, assistantMeta, memberMeta] = await Promise.all([
    s3.putJson({ imageUrl: null }),
    s3.putJson({ imageUrl: null, role: "assistant" }),
    s3.putJson({ ...memberBadgeMetadata, imageUrl: null }),
  ]);

  const receipt = await chain.sendAs(input.manager, {
    to: COMMUNITY_REGISTRY_ADDRESS,
    data: encodeFunctionData({
      abi: CommunityRegistryAbi,
      functionName: "createCommunity",
      args: [name, description, managerMeta.uri, assistantMeta.uri, memberMeta.uri],
    }),
  });
  const [created] = parseEventLogs({
    abi: CommunityRegistryAbi,
    eventName: "CommunityCreated",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, COMMUNITY_REGISTRY_ADDRESS)),
  });
  if (!created) throw new Error("Seeding failed: createCommunity emitted no CommunityCreated event");
  const { communityId, assistantBadgeId, memberBadgeId } = created.args;
  const createdAt = await blockTime(chain, receipt);

  // The fake must know the three badges before the overlay refers to them.
  await subgraph.sync();

  const seeded: SeededCommunity = {
    id: communityId,
    name,
    description,
    manager: input.manager,
    managerBadgeId: communityId,
    assistantBadgeId,
    memberBadgeId,
    createdAt,
    uris: { manager: managerMeta.uri, assistant: assistantMeta.uri, member: memberMeta.uri },
    memberBadgeMetadata,
    memberCount: 1,
  };

  await subgraph.overlay(
    communityAsIndexed({
      id: communityId,
      name,
      description,
      manager: input.manager,
      assistantBadgeId,
      memberBadgeId,
      createdAt,
      txHash: receipt.transactionHash,
      tier: input.tier,
      tierExpiresAt: input.tierExpiresAt,
    }),
  );
  return seeded;
}

/**
 * Makes `member` a member: the manager mints the member badge to it on
 * chain, and the fake gets the membership the real subgraph would record.
 * Returns when the member joined, in seconds, as the membership records it.
 */
export async function addMember(deps: SeedDeps, seeded: SeededCommunity, member: Address): Promise<number> {
  const receipt = await deps.chain.writeBadgesAs(seeded.manager, "mint", [
    member,
    seeded.memberBadgeId,
    BigInt(1),
    "0x",
  ]);
  const joinedAt = (await blockTime(deps.chain, receipt)) + 1;
  await deps.subgraph.sync();
  seeded.memberCount += 1;
  await deps.subgraph.overlay(
    communityMember({
      communityId: seeded.id,
      address: member,
      badgeId: seeded.memberBadgeId,
      joinedAt,
      txHash: receipt.transactionHash,
    }),
    community(seeded.id, { memberCount: String(seeded.memberCount) }),
  );
  return joinedAt;
}

/**
 * Makes `assistant` an assistant: the manager mints the assistant badge to
 * it on chain. The fake follows that by itself (a badge holder); the
 * subgraph records nothing else for an assistant.
 */
export async function addAssistant(deps: SeedDeps, seeded: SeededCommunity, assistant: Address) {
  await deps.chain.writeBadgesAs(seeded.manager, "mint", [assistant, seeded.assistantBadgeId, BigInt(1), "0x"]);
  await deps.subgraph.sync();
}

// ---- what the real subgraph would index after a write ----------------------

/** After `updateCommunityDetails`: the community's name and description, read from the chain. */
export async function indexedDetails(chain: Chain, communityId: bigint): Promise<OverlayOp[]> {
  const details = await readCommunityOnChain(chain, communityId);
  return [community(communityId, { name: details.name, description: details.description })];
}

/** After the manager badge moved: the new holder is the community's manager. */
export function indexedManagerChange(seeded: SeededCommunity, newManager: Address): OverlayOp[] {
  const id = seeded.id.toString();
  const to = newManager.toLowerCase();
  return [
    user(to),
    community(id, { manager: to, managerAddress: to }),
    { op: "unlink", type: "User", id: seeded.manager.toLowerCase(), field: "managedCommunities", ids: [id] },
    link("User", to, "managedCommunities", [id]),
  ];
}
