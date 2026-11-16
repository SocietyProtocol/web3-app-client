import { encodeFunctionData, isAddressEqual, type Address, type HDAccount } from "viem";
import { SocietyProtocolBadgesABI } from "../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS, GOVERNOR_BADGE, LEGACY_POOL } from "../env/hermetic";
import type { S3Fake } from "./backends/s3";
import type { SubgraphFake } from "./backends/subgraph";
import { seedCommunity, type SeededCommunity } from "./builders/community-detail-seed";
import type { Chain } from "./chain/chain";
import { testAccount } from "./wallet/keys";

/**
 * Personas: the kinds of user a scenario starts from.
 *
 * Every persona is a fresh key (see wallet/keys.ts) plus the state that kind
 * of user has, written to the local chain by real contract calls. The
 * subgraph fake follows the chain, so the same state is in its answers: a
 * persona never needs a separate overlay for what it did on chain.
 *
 * | Persona            | State |
 * |--------------------|-------|
 * | new                | nothing: no ETH, no Light Account, no profile |
 * | newFunded          | `new`, and the owner wallet holds ETH (it can pay when sponsorship is refused) |
 * | member             | a profile, created by a sponsored user operation that also deployed the Light Account |
 * | fundedMember       | `member`, and the owner wallet holds ETH (for writes that are not sponsored) |
 * | governor           | `fundedMember` whose Society address holds the Governor badge |
 * | badgeMinter        | `fundedMember` that may mint `badge`, a badge that already has one holder (`holder`) |
 * | officialBadgeCreator | `fundedMember` whose Society address holds OFFICIAL_BADGE_CREATOR_ROLE |
 * | communityManager   | `fundedMember` whose Society address manages `community`, created on chain through the registry |
 * | legacy             | a member from before smart accounts: the WALLET holds a profile, its Society address has none and is not deployed |
 * | contractWallet, eip7702: not implemented yet |
 *
 * Two of them are not like the others:
 *   - communityManager: the fake does not follow the CommunityRegistry, so
 *     the Community entity is an overlay (builders/community-detail-seed.ts)
 *     and lasts for the test that made the persona.
 *   - legacy: the app's legacy map is compiled into the bundle, so the
 *     wallets are a fixed pool (LEGACY_POOL in env/hermetic.ts), not fresh
 *     keys. A wallet is used up when its Society address gets a profile;
 *     when the pool is spent the stack has to be restarted.
 */
export type PersonaKind =
  | "new"
  | "newFunded"
  | "member"
  | "fundedMember"
  | "governor"
  | "badgeMinter"
  | "communityManager"
  | "officialBadgeCreator"
  | "contractWallet"
  | "eip7702"
  | "legacy";

export type PersonaOptions = {
  /** Profile name; a unique one is made up when left out. */
  name?: string;
  bio?: string;
};

export type Persona = {
  kind: PersonaKind;
  /** The wallet key. Only for the local fork. */
  owner: HDAccount;
  /** The wallet's address ("Wallet (owner)" in the account menu). */
  ownerAddress: Address;
  /** The Society address: the owner's Light Account, which the contracts see. */
  address: Address;
  /** Set for personas with a profile. */
  profile?: { badgeId: bigint; name: string; bio: string; uri: string };
  /** badgeMinter: the badge this persona may mint. */
  badge?: { id: bigint; name: string };
  /** badgeMinter: a member that already holds `badge`. */
  holder?: Persona;
  /** communityManager: the community this persona's Society address manages. */
  community?: SeededCommunity;
};

export type PersonaDeps = {
  chain: Chain;
  s3: S3Fake;
  subgraph: SubgraphFake;
  /** A fresh test key; a different one on every call. */
  nextAccount: () => HDAccount;
};

const OWNER_ETH = 10;

const NOT_IMPLEMENTED: Partial<Record<PersonaKind, string>> = {
  contractWallet: "needs the wallet fixture's contract-wallet mode (address override and a 1271 mock)",
  eip7702: "needs anvil_setCode with a 0xef0100 delegation; nobody has tried it",
};

function uniqueSuffix(address: Address) {
  return address.slice(2, 8).toLowerCase();
}

async function createProfile(deps: PersonaDeps, persona: Persona, options: PersonaOptions) {
  const name = options.name ?? `E2E Member ${uniqueSuffix(persona.address)}`;
  const bio = options.bio ?? "Created by the browser test suite.";
  const { uri } = await deps.s3.putJson({ name, bio, imageUrl: null, timestamp: new Date().toISOString() });
  await deps.chain.sendSponsored(persona.owner, [
    {
      to: BADGES_ADDRESS,
      data: encodeFunctionData({ abi: SocietyProtocolBadgesABI, functionName: "createProfile", args: [uri] }),
    },
  ]);
  const badgeId = await deps.chain.profileBadgeId(persona.address);
  if (badgeId === BigInt(0)) throw new Error(`Seeding failed: ${persona.address} has no profile badge`);
  persona.profile = { badgeId, name, bio, uri };
}

async function createMintableBadge(deps: PersonaDeps, persona: Persona) {
  const profileBadge = persona.profile!.badgeId;
  const name = `E2E Badge ${uniqueSuffix(persona.address)}`;
  const { uri } = await deps.s3.putJson({ name, description: "A badge made for one browser test.", imageUrl: null });
  // Minters, transferers and burners are badge ids: the persona's own
  // profile badge means "this member".
  const id = await deps.chain.createBadge({
    creator: persona.address,
    name,
    uri,
    minters: [profileBadge],
    burners: [profileBadge],
  });
  persona.badge = { id, name };
}

/**
 * A member from before smart accounts: the first wallet of the pool whose
 * Society address has no profile yet. The wallet itself gets a profile
 * with the given name and bio, sent by the wallet (or has its existing one
 * changed to them, when an earlier test already used the wallet without
 * using it up). The wallet is left without ETH.
 */
async function legacyPersona(deps: PersonaDeps, options: PersonaOptions): Promise<Persona> {
  for (const entry of LEGACY_POOL) {
    if ((await deps.chain.profileBadgeId(entry.society)) !== BigInt(0)) continue;
    const owner = testAccount(entry.index);
    const address = deps.chain.societyAddress(owner.address);
    if (!isAddressEqual(owner.address, entry.wallet) || !isAddressEqual(address, entry.society)) {
      throw new Error(
        `e2e/env/hermetic.json: legacyAccounts.pairs does not match test key ${entry.index} ` +
          `(wallet ${owner.address}, Society address ${address})`,
      );
    }
    const name = options.name ?? `E2E Legacy ${uniqueSuffix(owner.address)}`;
    const bio = options.bio ?? "A member since before smart accounts.";
    const { uri } = await deps.s3.putJson({ name, bio, imageUrl: null, timestamp: new Date().toISOString() });
    const existing = await deps.chain.profileBadgeId(owner.address);
    if (existing === BigInt(0)) await deps.chain.writeBadgesAs(owner.address, "createProfile", [uri]);
    else await deps.chain.writeBadgesAs(owner.address, "updateProfileURI", [existing, uri]);
    return { kind: "legacy", owner, ownerAddress: owner.address, address };
  }
  throw new Error(
    `Persona "legacy": all ${LEGACY_POOL.length} wallets of the legacy pool have been used up on this chain ` +
      "(their Society addresses have profiles). Restart the stack.",
  );
}

/**
 * Builds a persona and its state. Used through the `persona` and `actor`
 * fixtures; see e2e/fixtures.ts.
 */
export async function createPersona(
  deps: PersonaDeps,
  kind: PersonaKind,
  options: PersonaOptions = {},
): Promise<Persona> {
  const reason = NOT_IMPLEMENTED[kind];
  if (reason) throw new Error(`Persona "${kind}" is not implemented yet: it ${reason}.`);

  if (kind === "legacy") {
    const legacy = await legacyPersona(deps, options);
    await deps.subgraph.sync();
    return legacy;
  }

  const owner = deps.nextAccount();
  const persona: Persona = {
    kind,
    owner,
    ownerAddress: owner.address,
    address: deps.chain.societyAddress(owner.address),
  };

  switch (kind) {
    case "new":
      break;
    case "newFunded":
      await deps.chain.setBalance(owner.address, OWNER_ETH);
      break;
    case "member":
      await createProfile(deps, persona, options);
      break;
    // The steps of a persona that do not depend on each other run at the
    // same time: they are different accounts' transactions, and the chain
    // takes them in any order.
    case "fundedMember":
      await Promise.all([createProfile(deps, persona, options), deps.chain.setBalance(owner.address, OWNER_ETH)]);
      break;
    case "governor":
      await Promise.all([createProfile(deps, persona, options), deps.chain.setBalance(owner.address, OWNER_ETH)]);
      await deps.chain.mintBadge({ badgeId: GOVERNOR_BADGE, to: persona.address });
      break;
    case "officialBadgeCreator":
      await Promise.all([createProfile(deps, persona, options), deps.chain.setBalance(owner.address, OWNER_ETH)]);
      await deps.chain.grantBadgesRole("OFFICIAL_BADGE_CREATOR_ROLE", persona.address);
      break;
    case "communityManager":
      await Promise.all([createProfile(deps, persona, options), deps.chain.setBalance(owner.address, OWNER_ETH)]);
      // The registry mints the manager badge and a member badge to the
      // creator, so the Light Account has to exist before it creates one.
      persona.community = await seedCommunity(deps, { manager: persona.address });
      break;
    case "badgeMinter": {
      const [holder] = await Promise.all([
        createPersona(deps, "member"),
        createProfile(deps, persona, options).then(() => createMintableBadge(deps, persona)),
        deps.chain.setBalance(owner.address, OWNER_ETH),
      ]);
      await deps.chain.writeBadgesAs(persona.address, "mint", [holder.address, persona.badge!.id, BigInt(1), "0x"]);
      persona.holder = holder;
      break;
    }
    default:
      throw new Error(`Unknown persona "${kind}"`);
  }

  // Make the subgraph fake catch up, so the first page load already sees the seed.
  await deps.subgraph.sync();
  return persona;
}
