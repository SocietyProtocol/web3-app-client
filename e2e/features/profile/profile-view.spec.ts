import { isAddressEqual } from "viem";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { link, newCommunity, user } from "../../support/builders/entities";
import { setSpecBalance, specBalance, specToken } from "../../support/builders/profile-spec-balance";
import { ProfileDetails, shortAddress } from "../../support/pages/profile-details";

/**
 * A member's own profile (/profile), as it is shown: the three numbers at
 * the top, the member's card, and the data card with the Society address,
 * the profile id and who referred the member.
 *
 * The badges row and its "View All Badges" modal (D5) are covered by G8 in
 * features/badges/profile-badges.spec.ts.
 */

/** The text as a regular expression source, with nothing in it read as a pattern. */
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test.describe("profile", () => {
  test(
    "D1: a member's profile shows the stats, the member's card, the Society address, the profile id and the referrer",
    { tag: ["@smoke"] },
    async ({ persona, actor, pages, page, chain, subgraph, wallet }) => {
      const referrer = await actor("member", { name: "Referrer Rhea" });
      const me = await persona("member", { name: "Detail Dora", bio: "Reads her own profile." });
      const profile = new ProfileDetails(page);
      const { symbol } = await specToken(chain);

      // One badge besides the profile badge, held on chain. The referrer and
      // the community are subgraph state only: the page reads both from there.
      await chain.mintBadge({ badgeId: GOVERNOR_BADGE, to: me.address });
      await subgraph.sync();
      const communityId = "9100001";
      await subgraph.overlay(
        newCommunity({ id: communityId, name: "E2E Guild", manager: referrer.address, managerBadgeId: "9100002" }),
        link("User", me.address, "communities", [communityId]),
        user(me.address, { invitedBy: referrer.address.toLowerCase() }),
      );

      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();
      await expect(profile.heading("Detail Dora")).toBeVisible();

      // The numbers: SPEC (none), communities, badges (the profile badge does not count).
      await expect(profile.balanceStat).toHaveText(new RegExp(`^\\s*Total Balance\\s*0\\s+${literal(symbol)}`));
      await expect(profile.communitiesStat).toHaveText(/^\s*Communities\s*1\s*$/);
      await expect(profile.badgesStat).toHaveText(/^\s*Badges\s*1\s*$/);
      await expect(pages.profile.badges.section).toContainText("Badges held by Detail Dora (1)");

      // The member's card, with the way into the edit form.
      await expect(pages.profile.details).toContainText("Detail Dora");
      await expect(pages.profile.details).toContainText("Reads her own profile.");
      await expect(profile.editButton).toBeVisible();

      // The data card: the profile belongs to the Society address (the Light
      // Account), not to the wallet, and it is that address that is shown in full.
      expect(isAddressEqual(me.address, me.ownerAddress)).toBe(false);
      await expect(pages.profile.details).toContainText("Associated address:");
      await expect(profile.associatedAddress(me.address)).toBeVisible();
      await expect(profile.associatedAddress(me.ownerAddress)).toHaveCount(0);
      await expect(pages.profile.details).toContainText("Profile ID:");
      await expect(pages.profile.details).toContainText(`#${me.profile!.badgeId}`);
      expect(await chain.profileBadgeId(me.address)).toBe(me.profile!.badgeId);

      // Who referred the member, as a link to that member's public profile.
      await expect(pages.profile.details).toContainText("Referred by");
      await expect(profile.referrerLink("Referrer Rhea")).toHaveAttribute(
        "href",
        `/user/${referrer.address.toLowerCase()}`,
      );
      await expect(pages.profile.details).not.toContainText("Not referred by anyone");
      await expect(profile.manageReferralsLink).toHaveAttribute("href", "/referrals");

      // Looking at one's own profile asks the wallet for nothing but the connection.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "D1: a member nobody referred, without badges or communities, sees zeros and \"Not referred by anyone\"",
    { tag: ["@core"] },
    async ({ persona, pages, page }) => {
      await persona("member", { name: "Plain Petra" });
      const profile = new ProfileDetails(page);

      await pages.profile.open();
      await pages.shell.connect();
      await expect(profile.heading("Plain Petra")).toBeVisible();

      await expect(profile.communitiesStat).toHaveText(/^\s*Communities\s*0\s*$/);
      await expect(profile.badgesStat).toHaveText(/^\s*Badges\s*0\s*$/);
      await expect(pages.profile.badges.section).toContainText("Badges held by Plain Petra (0)");
      await expect(pages.profile.badges.section).toContainText("No badges found");
      await expect(pages.profile.details).toContainText("Not referred by anyone");
      await expect(profile.manageReferralsLink).toBeVisible();
    },
  );

  test(
    "D2: the SPEC balance on a member's own profile is the owner wallet's, and says which wallet holds it",
    { tag: ["@core"] },
    async ({ persona, pages, page, chain, wallet }) => {
      const me = await persona("member", { name: "Balance Bea" });
      const profile = new ProfileDetails(page);
      const { symbol } = await specToken(chain);

      // SPEC stays on the wallet: 250 on the owner, none on the Society address.
      await setSpecBalance(chain, me.ownerAddress, 250);
      expect(await specBalance(chain, me.address)).toBe(BigInt(0));

      await pages.profile.open();
      await pages.shell.connect();
      await expect(profile.heading("Balance Bea")).toBeVisible();

      // The number is the wallet's balance, and the line under it names the
      // wallet: shortened in the text, in full in its title.
      const wallet4 = shortAddress(me.ownerAddress, 4);
      await expect(profile.balanceStat).toHaveText(
        new RegExp(
          `^\\s*Total Balance\\s*250\\s+${literal(symbol)}\\s*held by your wallet\\s+${literal(wallet4)}\\s*$`,
          "i",
        ),
      );
      await expect(profile.balanceHolderCaption).toHaveAttribute("title", new RegExp(`^${me.ownerAddress}$`, "i"));

      // The wallet's balance changes; after a reload the profile shows the new one.
      await setSpecBalance(chain, me.ownerAddress, 75);
      await page.reload();
      await expect(profile.balanceStat).toHaveText(
        new RegExp(`^\\s*Total Balance\\s*75\\s+${literal(symbol)}\\s*held by your wallet`, "i"),
      );

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
