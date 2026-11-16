import type { Address } from "viem";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";

/**
 * The badges on a profile: every card shows "n / total" at the bottom, n
 * being the profile's balance of that badge and total the badge's total
 * supply, both read from the chain by the page. The same cards are in the
 * "View All Badges" modal. The expected numbers come from the chain.
 */

type UserQuery = { user: { badges: { id: string }[] } | null };

test.describe("badges on a profile", () => {
  test(
    "G8: every badge card on a profile shows n / total, in the row and in the badges modal",
    { tag: ["@core"] },
    async ({ pages, chain, subgraph, graphql }) => {
      // The account of the fork that holds the most badges: more than the row shows.
      const users = await subgraph.entities("User");
      const account = [...users].sort((a, b) => b.badges.length - a.badges.length || a.id.localeCompare(b.id))[0]
        .id as Address;
      const { data } = await graphql<UserQuery>("User", { id: account });
      const badgeIds = (data?.user?.badges ?? []).map((badge) => badge.id);
      expect(badgeIds.length, "the fork has an account with more than six badges").toBeGreaterThan(6);

      const expected = new Map<string, string>();
      for (const id of badgeIds) {
        const balance = await chain.badgeBalance(account, id);
        expect(balance, `${account} holds badge ${id} on chain`).toBeGreaterThan(BigInt(0));
        expected.set(id, `${balance} / ${await chain.badgeTotalSupply(id)}`);
      }

      await pages.profile.openUser(account);
      const badges = pages.profile.badges;
      await expect(badges.section).toContainText(`(${badgeIds.length})`);

      // The row: the first six badges.
      const shown = await badges.ids();
      expect(shown).toHaveLength(6);
      for (const id of shown) {
        expect(badgeIds).toContain(id);
        await expect(badges.amountChip(badges.card(id))).toHaveText(expected.get(id)!);
      }

      // The modal: every badge, once.
      const inModal = await badges.visitModal(async (id, card) => {
        expect(badgeIds).toContain(id);
        await expect(badges.amountChip(card)).toHaveText(expected.get(id)!);
      });
      expect([...inModal].sort()).toEqual([...badgeIds].sort());
      await expect(badges.modal).toContainText(`(${badgeIds.length})`);
    },
  );

  test(
    "G8: a member's own profile shows how many of each badge they hold, also a badge held twice",
    { tag: ["@core"] },
    async ({ persona, actor, pages, chain, wallet }) => {
      // Two units of the Governor badge, and one unit of a badge that someone else holds too.
      const [issuer, me] = await Promise.all([actor("badgeMinter"), persona("member")]);
      const otherBadge = issuer.badge!.id;
      await chain.mintBadge({ badgeId: GOVERNOR_BADGE, to: me.address, amount: BigInt(2) });
      await chain.writeBadgesAs(issuer.address, "mint", [me.address, otherBadge, BigInt(1), "0x"]);
      const governorSupply = await chain.badgeTotalSupply(GOVERNOR_BADGE);
      expect(await chain.badgeBalance(me.address, GOVERNOR_BADGE)).toBe(BigInt(2));
      expect(await chain.badgeBalance(me.address, otherBadge)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(otherBadge)).toBe(BigInt(2));

      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();

      const badges = pages.profile.badges;
      await expect(badges.section).toContainText(`Badges held by ${me.profile!.name} (2)`);
      await expect(badges.cards).toHaveCount(2);
      await expect(badges.amountChip(badges.card(GOVERNOR_BADGE))).toHaveText(`2 / ${governorSupply}`);
      await expect(badges.amountChip(badges.card(otherBadge))).toHaveText("1 / 2");
      await expect(badges.card(otherBadge)).toContainText(issuer.badge!.name);
      // Two badges fit in the row: no modal to open.
      await expect(badges.viewAllButton).toHaveCount(0);

      // Looking at one's own profile asks the wallet for nothing but the connection.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
