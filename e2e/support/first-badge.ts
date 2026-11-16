import type { BrowserContext } from "@playwright/test";
import { encodeFunctionData, parseAbi, zeroAddress, type Address, type Hex } from "viem";
import { SocietyProtocolBadgesABI } from "../../src/abis/SocietyProtocolBadges";
import { encodeExecute } from "../../src/lib/smart-account";
import { BADGES_ADDRESS, ENTRY_POINT_ADDRESS, FORK_BLOCK, URLS } from "../env/hermetic";
import type { Chain } from "./chain/chain";
import type { SubgraphFake } from "./backends/subgraph";
import { badge } from "./builders/entities";
import type { Persona } from "./personas";

/**
 * The free first badge (src/lib/aa/first-badge.ts) is off unless the
 * server's SPONSOR_FIRST_BADGE is "true", and the stack leaves it unset so
 * that every other badge test sees the app as deployments without it do.
 * A test turns it on for itself with this cookie, which only the suite's
 * own build honours (e2eRequestSwitch in src/lib/e2e-overrides.ts). The
 * name is repeated here because that module is not a pure one.
 */
export const FIRST_BADGE_COOKIE = "e2e-sponsor-first-badge";

/** Turns the free first badge on for every request of this browser context. */
export async function enableFreeFirstBadge(context: BrowserContext) {
  await context.addCookies([{ name: FIRST_BADGE_COOKIE, value: "1", url: URLS.app }]);
}

/** The header that does the same for the `api` fixture's requests. */
export const FIRST_BADGE_HEADER = { cookie: `${FIRST_BADGE_COOKIE}=1` };

/**
 * The proxy's refusals for the free badge, copied from FIRST_BADGE_REASONS
 * in src/lib/aa/first-badge.ts (that module reads server settings, so it
 * is not imported here). Keep the two in step.
 */
export const FIRST_BADGE_REASONS = {
  disabled: "The free first badge is not enabled",
  used: "This account has already created a badge",
  unchecked: "Could not check this account's badges",
  behind: "Badge history is still syncing",
  nonce: "User operation nonce is not the account's next nonce",
  noProfile: "This account has no Society profile yet",
  profileTooNew: "This account's profile is too new for a free badge",
} as const;

/** The proxy's refusal once the app's free badges for the day are given out (pimlico-proxy.ts). */
export const FIRST_BADGE_DAILY_CAP_MESSAGE = "Today's free badges have all been given out";

/**
 * Makes the persona's profile look two days old to the app. The free badge
 * needs a profile at least FIRST_BADGE_MIN_PROFILE_AGE_HOURS old (6 by
 * default, and the stack leaves it unset), but personas are made during the
 * run. The app reads the age from the subgraph's Badge.createdAt, so this
 * overlays that one field; the chain and the profile itself are untouched.
 * Overlays are dropped before the next test.
 */
export async function ageProfile(subgraph: SubgraphFake, persona: Pick<Persona, "address" | "profile">) {
  if (!persona.profile) throw new Error(`ageProfile: ${persona.address} has no profile`);
  const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 3600;
  await subgraph.overlay(badge(persona.profile.badgeId, { createdAt: String(twoDaysAgo) }));
}

/** The wizard's notice on the Permissions step while the badge would be free. */
export const FREE_BADGE_NOTICE_TEST_ID = "badge-create-free-badge-notice";

/** createBadge as the wizard sends it for a badge without metadata, wrapped in execute. */
export function freeBadgeCallData(name: string): Hex {
  return encodeExecute({
    to: BADGES_ADDRESS,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: SocietyProtocolBadgesABI,
      functionName: "createBadge",
      args: [name, false, false, zeroAddress, "", [], [], [], []],
    }),
  });
}

const GET_NONCE = parseAbi(["function getNonce(address sender, uint192 key) view returns (uint256)"]);

/** The account's next EntryPoint nonce on key 0, as the app would put in its next user operation. */
export async function nextNonce(chain: Chain, account: Address): Promise<bigint> {
  return chain.public.readContract({
    address: ENTRY_POINT_ADDRESS,
    abi: GET_NONCE,
    functionName: "getNonce",
    args: [account, BigInt(0)],
  });
}

/**
 * BadgeCreated events of the badges contract whose creator is `creator`,
 * since the fork block: test accounts are fresh, so nothing before it.
 */
export async function badgesCreatedBy(chain: Chain, creator: Address) {
  return chain.public.getContractEvents({
    address: BADGES_ADDRESS,
    abi: SocietyProtocolBadgesABI,
    eventName: "BadgeCreated",
    args: { creator },
    fromBlock: BigInt(FORK_BLOCK),
  });
}
