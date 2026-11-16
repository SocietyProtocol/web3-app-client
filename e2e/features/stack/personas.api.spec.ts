import { isAddressEqual } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS, GOVERNOR_BADGE, LEGACY_POOL } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { cidOf } from "../../support/backends/s3";
import { readCommunityOnChain } from "../../support/builders/community-detail-seed";

/**
 * Checks of the personas themselves: what a persona claims to be is true on
 * the local chain AND in the subgraph fake's answers. No browser.
 */
type UserQuery = {
  user: {
    id: string;
    name: string | null;
    metadata: { name: string | null; bio: string | null } | null;
    profile: { id: string } | null;
    badges: { id: string }[];
  } | null;
};

test.describe("personas", () => {
  test("PS-1: new has nothing, anywhere", { tag: ["@core"] }, async ({ actor, chain, graphql }) => {
    const user = await actor("new");
    expect(user.address).not.toBe(user.ownerAddress);
    expect(await chain.balance(user.ownerAddress)).toBe(BigInt(0));
    expect(await chain.balance(user.address)).toBe(BigInt(0));
    expect(await chain.isContract(user.address)).toBe(false);
    expect(await chain.profileBadgeId(user.address)).toBe(BigInt(0));
    expect((await graphql<UserQuery>("User", { id: user.address.toLowerCase() })).data?.user).toBeNull();
  });

  test("PS-2: member has a profile on its Light Account and in the subgraph", { tag: ["@smoke"] }, async ({
    actor,
    chain,
    graphql,
    s3,
  }) => {
    const member = await actor("member", { name: "Grace Hopper", bio: "Compilers." });

    const badgeId = await chain.profileBadgeId(member.address);
    expect(badgeId).toBe(member.profile!.badgeId);
    expect(badgeId).toBeGreaterThan(BigInt(0));
    expect(await chain.isContract(member.address)).toBe(true);
    expect(await chain.profileBadgeId(member.ownerAddress)).toBe(BigInt(0));
    // Sponsored: nobody's ETH moved.
    expect(await chain.balance(member.ownerAddress)).toBe(BigInt(0));
    expect(await chain.balance(member.address)).toBe(BigInt(0));
    expect(await s3.getJson(cidOf(await chain.read("uri", [badgeId])))).toMatchObject({ name: "Grace Hopper" });

    const { data } = await graphql<UserQuery>("User", { id: member.address.toLowerCase() });
    expect(data?.user?.profile?.id).toBe(badgeId.toString());
    expect(data?.user?.metadata).toMatchObject({ name: "Grace Hopper", bio: "Compilers." });
    // The profile badge is not listed among the user's badges (the query filters it out).
    expect(data?.user?.badges).toEqual([]);
  });

  test("PS-3: governor holds the Governor badge on chain and in the subgraph", { tag: ["@core"] }, async ({
    actor,
    chain,
    graphql,
  }) => {
    const supplyBefore = await chain.badgeTotalSupply(GOVERNOR_BADGE);
    const governor = await actor("governor");

    expect(await chain.badgeBalance(governor.address, GOVERNOR_BADGE)).toBe(BigInt(1));
    expect(await chain.badgeTotalSupply(GOVERNOR_BADGE)).toBe(supplyBefore + BigInt(1));
    expect(await chain.balance(governor.ownerAddress)).toBeGreaterThan(BigInt(0));
    expect(await chain.balance(governor.address)).toBe(BigInt(0));

    const { data } = await graphql<UserQuery>("User", { id: governor.address.toLowerCase() });
    expect(data?.user?.badges.map((badge) => badge.id)).toEqual([GOVERNOR_BADGE]);
    const badge = await graphql<{ badge: { holders: { id: string }[] } }>("Badge", { id: GOVERNOR_BADGE });
    expect(badge.data?.badge.holders.map((holder) => holder.id)).toContain(governor.address.toLowerCase());
  });

  test("PS-4: badgeMinter may mint its badge, which already has one holder", { tag: ["@core"] }, async ({
    actor,
    chain,
    graphql,
  }) => {
    const minter = await actor("badgeMinter");
    const badgeId = minter.badge!.id;
    const holder = minter.holder!;

    expect(await chain.read("getBadgeMinters", [badgeId])).toEqual([minter.profile!.badgeId]);
    expect(await chain.badgeBalance(holder.address, badgeId)).toBe(BigInt(1));
    expect(await chain.badgeTotalSupply(badgeId)).toBe(BigInt(1));
    expect(await chain.balance(minter.address), "seeding left no ETH on the Light Account").toBe(BigInt(0));
    // The contract itself agrees that the persona may mint: a simulated mint succeeds.
    await chain.public.simulateContract({
      address: BADGES_ADDRESS,
      abi: SocietyProtocolBadgesABI,
      functionName: "mint",
      args: [holder.address, badgeId, BigInt(1), "0x"],
      account: minter.address,
    });

    const { data } = await graphql<{
      badge: {
        name: string;
        holdersCount: string;
        holders: { id: string }[];
        minters: { id: string }[];
        managers: { id: string }[];
      };
    }>("Badge", { id: badgeId.toString() });
    expect(data?.badge.name).toBe(minter.badge!.name);
    expect(data?.badge.holdersCount).toBe("1");
    expect(data?.badge.holders.map((entry) => entry.id)).toEqual([holder.address.toLowerCase()]);
    expect(data?.badge.minters.map((entry) => entry.id)).toEqual([minter.profile!.badgeId.toString()]);
    expect(data?.badge.managers.map((entry) => entry.id)).toEqual([minter.address.toLowerCase()]);
  });

  test("PS-5: a persona that is not implemented says so", { tag: ["@core"] }, async ({ actor }) => {
    await expect(actor("contractWallet")).rejects.toThrow(/Persona "contractWallet" is not implemented yet/);
    await expect(actor("eip7702")).rejects.toThrow(/Persona "eip7702" is not implemented yet/);
  });

  test("PS-6: officialBadgeCreator holds the role and can create an official badge", { tag: ["@core"] }, async ({
    actor,
    chain,
    graphql,
  }) => {
    const creator = await actor("officialBadgeCreator");
    const role = await chain.read("OFFICIAL_BADGE_CREATOR_ROLE");
    expect(await chain.read("hasRole", [role, creator.address])).toBe(true);
    expect(await chain.read("hasRole", [role, creator.ownerAddress])).toBe(false);
    expect(await chain.balance(creator.address), "seeding left no ETH on the Light Account").toBe(BigInt(0));

    const badgeId = await chain.createBadge({
      creator: creator.address,
      name: "PS-6 official badge",
      uri: "",
      isOfficial: true,
    });
    const { data } = await graphql<{ badge: { name: string; isOfficial: boolean; isCommunity: boolean } }>("Badge", {
      id: badgeId.toString(),
    });
    expect(data?.badge).toMatchObject({ name: "PS-6 official badge", isOfficial: true, isCommunity: false });

    // Without the role the contract refuses an official badge.
    const member = await actor("member");
    await expect(
      chain.createBadge({ creator: member.address, name: "not official", uri: "", isOfficial: true }),
    ).rejects.toThrow();
  });

  test(
    "PS-7: communityManager manages a community on chain, and the subgraph fake lists it",
    { tag: ["@core"] },
    async ({ actor, chain, graphql }) => {
      const manager = await actor("communityManager");
      const community = manager.community!;
      expect((await readCommunityOnChain(chain, community.id)).name).toBe(community.name);
      // The registry gave its creator the manager badge and a member badge.
      expect(await chain.badgeBalance(manager.address, community.managerBadgeId)).toBe(BigInt(1));
      expect(await chain.badgeBalance(manager.address, community.memberBadgeId)).toBe(BigInt(1));
      expect(await chain.balance(manager.address), "seeding left no ETH on the Light Account").toBe(BigInt(0));

      const { data, errors } = await graphql<{ community: { name: string; manager: { id: string } } | null }>(
        "Community",
        { id: community.id.toString() },
      );
      expect(errors).toBeUndefined();
      expect(data?.community?.name).toBe(community.name);
      expect(data?.community?.manager.id).toBe(manager.address.toLowerCase());
    },
  );

  test(
    "PS-8: legacy is a wallet of the pool with a profile of its own, whose Society address has nothing",
    { tag: ["@core"] },
    async ({ actor, chain, graphql }) => {
      const legacy = await actor("legacy", { name: "PS-8 Old Timer", bio: "From before." });
      expect(LEGACY_POOL.map((entry) => entry.wallet)).toContain(legacy.ownerAddress.toLowerCase());
      expect(isAddressEqual(legacy.address, chain.societyAddress(legacy.ownerAddress))).toBe(true);
      expect(legacy.profile).toBeUndefined();

      expect(await chain.profileBadgeId(legacy.ownerAddress)).toBeGreaterThan(BigInt(0));
      expect(await chain.profileBadgeId(legacy.address)).toBe(BigInt(0));
      expect(await chain.balance(legacy.ownerAddress), "seeding left no ETH on the wallet").toBe(BigInt(0));

      const wallet = await graphql<UserQuery>("User", { id: legacy.ownerAddress.toLowerCase() });
      expect(wallet.data?.user?.metadata).toMatchObject({ name: "PS-8 Old Timer", bio: "From before." });
    },
  );
});
