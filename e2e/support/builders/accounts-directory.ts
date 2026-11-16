import { getAddress, type Address } from "viem";
import legacyAccountMap from "../../../src/consts/legacy-account-map.json";
import { CHAIN_ID, LEGACY_POOL } from "../../env/hermetic";
import type { SubgraphFake } from "../backends/subgraph";
import { badge, memberWithProfile, user, type OverlayOp, type ProtocolRole, type UserEntity } from "./entities";

/**
 * Builders for the accounts directory (/accounts) and for the members
 * from before smart accounts, whose old wallet and Society address the app
 * pairs up from a map compiled into the bundle.
 */

/**
 * A creation time later than any real one (the year 2100, in seconds), so
 * that a member made here is among the first of the directory's "Newest"
 * order whatever else is on the chain. Add a small number to order several.
 */
export const FAR_FUTURE = 4_102_444_800;

/**
 * A member that exists only in the subgraph fake, for the directory: a
 * profile with a name, and optionally a creation time (what "Newest" sorts
 * by), protocol roles (what the role filter reads) and `User.name` (what
 * "Name" sorts by; without `sortName` the name is in the metadata only,
 * as it is for members the chain follower indexes).
 */
export function directoryMember(input: {
  address: string;
  profileBadgeId: string | bigint | number;
  name: string;
  bio?: string | null;
  createdAt?: number;
  roles?: ProtocolRole[];
  sortName?: boolean;
}): OverlayOp[] {
  const profileBadgeId = String(input.profileBadgeId);
  const fields: Partial<Omit<UserEntity, "id">> = {};
  if (input.roles) {
    fields.protocolRoles = input.roles;
    fields.protocolRoleCount = input.roles.length;
  }
  if (input.sortName) fields.name = input.name;
  return [
    ...memberWithProfile({
      address: input.address,
      profileBadgeId,
      name: input.name,
      bio: input.bio,
    }),
    ...(input.createdAt === undefined ? [] : [badge(profileBadgeId, { createdAt: String(input.createdAt) })]),
    ...(Object.keys(fields).length ? [user(input.address, fields)] : []),
  ];
}

/** An old wallet from the app's legacy map and the Society address it moved to, both lowercase. */
export type LegacyPair = { wallet: Address; society: Address };

/**
 * The legacy map of the chain the tested build runs on, as the app reads
 * it: the committed map, and the test wallets the suite's build adds to it
 * (LEGACY_POOL, which the `legacy` persona uses).
 */
export function legacyPairs(): LegacyPair[] {
  const byChain = legacyAccountMap as Record<string, Record<string, string>>;
  const committed = Object.entries(byChain[String(CHAIN_ID)] ?? {}).map(([wallet, society]) => ({
    wallet: wallet.toLowerCase() as Address,
    society: society.toLowerCase() as Address,
  }));
  return [...committed, ...LEGACY_POOL.map(({ wallet, society }) => ({ wallet, society }))];
}

/**
 * The legacy pairs as the subgraph fake knows them right now:
 *   migrated  the old wallet has a profile and so has its Society address:
 *             the directory hides the wallet, /user/<wallet> redirects;
 *   pending   the old wallet has a profile, its Society address has none
 *             yet: the wallet is still listed and /user/<wallet> shows it.
 * Sorted by wallet, so that a test picks the same pair on every run.
 */
export async function legacyPairsByState(
  subgraph: SubgraphFake,
): Promise<{ migrated: LegacyPair[]; pending: LegacyPair[] }> {
  const users = await subgraph.entities("User");
  const withProfile = new Set(users.filter((entry) => entry.profile != null).map((entry) => entry.id.toLowerCase()));
  const pairs = legacyPairs()
    .filter((pair) => withProfile.has(pair.wallet))
    .sort((a, b) => a.wallet.localeCompare(b.wallet));
  return {
    migrated: pairs.filter((pair) => withProfile.has(pair.society)),
    pending: pairs.filter((pair) => !withProfile.has(pair.society)),
  };
}

/**
 * Addresses the directory lists when nothing is filtered, as a set of
 * lowercase addresses: every user with a profile, except the old wallets
 * whose Society address has a profile too.
 */
export async function directoryAddresses(subgraph: SubgraphFake): Promise<Set<string>> {
  const users = await subgraph.entities("User");
  const listed = new Set(users.filter((entry) => entry.profile != null).map((entry) => entry.id.toLowerCase()));
  for (const pair of legacyPairs()) {
    if (listed.has(pair.society)) listed.delete(pair.wallet);
  }
  return listed;
}

/** The address as the app prints a legacy map entry: with its checksum. */
export const checksummed = (address: string): Address => getAddress(address);
