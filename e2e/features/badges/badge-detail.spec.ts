import type { Address } from "viem";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import type { Chain } from "../../support/chain/chain";
import type { Pages } from "../../support/pages";

/**
 * /badges/<id>: the amount every holder holds.
 *
 * A holder's chip reads "n / total": n is the holder's balance of the badge
 * and total the badge's total supply, both read from the chain by the page.
 * It used to be shown for the Governor badge only; these tests cover one
 * badge of each kind. The expected numbers come from the chain.
 */

type BadgeQuery = {
  badge: { name: string; isOfficial: boolean; isCommunity: boolean; holders: { id: string }[] } | null;
};

/**
 * Opens the badge's page and checks the chip of every holder, in the
 * Holders section and, when there are more than fit there, in the modal.
 */
async function expectEveryHolderAmount(
  { pages, chain }: { pages: Pages; chain: Chain },
  badgeId: bigint | string,
  holders: string[],
) {
  const totalSupply = await chain.badgeTotalSupply(badgeId);
  const expected = new Map<string, string>();
  for (const holder of holders) {
    const balance = await chain.badgeBalance(holder as Address, badgeId);
    expect(balance, `${holder} holds badge ${badgeId} on chain`).toBeGreaterThan(BigInt(0));
    expected.set(holder, `${balance} / ${totalSupply}`);
  }

  await pages.badge.open(badgeId);
  const list = pages.badge.holders;
  await expect(list.section).toContainText(`Holders (${holders.length})`);

  // The section shows up to six holders.
  const shown = await list.addresses();
  expect(shown).toHaveLength(Math.min(holders.length, 6));
  for (const holder of shown) {
    expect(holders).toContain(holder);
    await expect(pages.badge.holderAmountChip(list.row(holder))).toHaveText(expected.get(holder)!);
  }

  if (holders.length <= 6) {
    expect([...shown].sort()).toEqual([...holders].sort());
    await expect(list.viewAllButton).toHaveCount(0);
    return;
  }
  // The rest are behind "View All Holders": every holder, once.
  const inModal = await list.visitModal(async (holder, card) => {
    expect(holders).toContain(holder);
    await expect(pages.badge.holderAmountChip(card)).toHaveText(expected.get(holder)!);
  });
  expect([...inModal].sort()).toEqual([...holders].sort());
}

test.describe("badge detail", () => {
  test(
    "G7: every holder of an individual badge shows n / total, in the list and in the modal",
    { tag: ["@smoke"] },
    async ({ pages, chain, subgraph, graphql }) => {
      // The Governor badge of the fork: an individual badge with more holders than the section shows.
      const { data } = await graphql<BadgeQuery>("Badge", { id: GOVERNOR_BADGE });
      expect(data?.badge).toMatchObject({ isOfficial: false, isCommunity: false });
      const holders = await subgraph.holdersOf(GOVERNOR_BADGE);
      expect(holders.length).toBeGreaterThan(6);

      await expectEveryHolderAmount({ pages, chain }, GOVERNOR_BADGE, holders);
      await expect(pages.badge.officialLabel).toHaveCount(0);
      await expect(pages.badge.communityLabel).toHaveCount(0);
    },
  );

  test(
    "G7: every holder of a community badge shows n / total",
    { tag: ["@smoke"] },
    async ({ pages, chain, subgraph }) => {
      // The community badge of the fork with the most holders.
      const users = await subgraph.entities("User");
      const holdersOf = (id: string) => users.filter((user) => user.badges.includes(id)).map((user) => user.id);
      const communityBadges = (await subgraph.entities("Badge"))
        .filter((badge) => badge.isCommunity && !badge.isOfficial)
        .map((badge) => ({ id: badge.id, holders: holdersOf(badge.id) }))
        .sort((a, b) => b.holders.length - a.holders.length || Number(a.id) - Number(b.id));
      const badge = communityBadges[0];
      expect(badge?.holders.length, "the fork has a community badge with several holders").toBeGreaterThan(1);
      expect(await chain.read("getIsCommunityBadge", [BigInt(badge.id)])).toBe(true);

      await expectEveryHolderAmount({ pages, chain }, badge.id, badge.holders);
      await expect(pages.badge.communityLabel).toBeVisible();
      await expect(pages.badge.officialLabel).toHaveCount(0);
    },
  );

  test(
    "G7: every holder of an official badge shows n / total, also a holder of several units",
    { tag: ["@smoke"] },
    async ({ actor, pages, chain, s3, graphql }) => {
      // The fork has no official badge: create one, held by two members, one of them twice.
      const [creator, twice, once] = await Promise.all([
        actor("officialBadgeCreator"),
        actor("member"),
        actor("member"),
      ]);
      const name = `E2E Official ${creator.address.slice(2, 8).toLowerCase()}`;
      const { uri } = await s3.putJson({ name, description: "An official badge made for one browser test." });
      const badgeId = await chain.createBadge({
        creator: creator.address,
        name,
        uri,
        isOfficial: true,
        minters: [creator.profile!.badgeId],
      });
      await chain.writeBadgesAs(creator.address, "mint", [twice.address, badgeId, BigInt(2), "0x"]);
      await chain.writeBadgesAs(creator.address, "mint", [once.address, badgeId, BigInt(1), "0x"]);
      expect(await chain.badgeTotalSupply(badgeId)).toBe(BigInt(3));

      const { data } = await graphql<BadgeQuery>("Badge", { id: badgeId.toString() });
      expect(data?.badge).toMatchObject({ name, isOfficial: true, isCommunity: false });
      const holders = [twice.address.toLowerCase(), once.address.toLowerCase()];
      expect(data?.badge?.holders.map((holder) => holder.id).sort()).toEqual([...holders].sort());

      await expectEveryHolderAmount({ pages, chain }, badgeId, holders);
      await expect(pages.badge.officialLabel).toBeVisible();
      await expect(pages.badge.communityLabel).toHaveCount(0);
      // Spelled out: two of three, and one of three.
      const list = pages.badge.holders;
      await expect(pages.badge.holderAmountChip(list.row(twice.address))).toHaveText("2 / 3");
      await expect(pages.badge.holderAmountChip(list.row(once.address))).toHaveText("1 / 3");
      await expect(list.row(twice.address)).toContainText(twice.profile!.name);
    },
  );
});
