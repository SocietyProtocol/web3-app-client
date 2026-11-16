import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { checksummed, directoryMember, legacyPairsByState } from "../../support/builders/accounts-directory";
import { setSpecBalance, specBalance, specToken } from "../../support/builders/profile-spec-balance";
import { ProfileDetails, shortAddress } from "../../support/pages/profile-details";

/**
 * /user/<address>: anyone's profile, for anyone. It is the page of
 * /profile without the ways to change things.
 *
 * Members from before smart accounts are on the fork in both states (see
 * legacyPairsByState): old wallets whose Society address already has a
 * profile, and old wallets whose Society address has none yet. The pairs
 * come from the map compiled into the app; nobody connects as one of them
 * here, the pages are only read.
 */

/** The text as a regular expression source, with nothing in it read as a pattern. */
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test.describe("public profiles", () => {
  test(
    "F8: anyone can read a member's profile at /user/<address>, without Edit and without Manage referrals",
    { tag: ["@smoke"] },
    async ({ persona, actor, pages, page, chain, subgraph, wallet }) => {
      const someone = await actor("member", { name: "Public Paula", bio: "Seen by anyone." });
      const viewer = await persona("member", { name: "Viewer Vic" });
      const profile = new ProfileDetails(page);
      await chain.mintBadge({ badgeId: GOVERNOR_BADGE, to: someone.address });
      await subgraph.sync();
      const governorSupply = await chain.badgeTotalSupply(GOVERNOR_BADGE);

      // Without a wallet: the profile, not a prompt to connect.
      await pages.profile.openUser(someone.address);
      await expect(pages.profile.details).toBeVisible();
      await expect(pages.shell.connectPrompt).toBeHidden();
      await expect(profile.heading("Public Paula")).toBeVisible();
      await expect(pages.profile.details).toContainText("Public Paula");
      await expect(pages.profile.details).toContainText("Seen by anyone.");
      await expect(profile.associatedAddress(someone.address)).toBeVisible();
      await expect(pages.profile.details).toContainText(`#${someone.profile!.badgeId}`);
      await expect(pages.profile.details).toContainText("Not referred by anyone");
      await expect(profile.badgesStat).toHaveText(/^\s*Badges\s*1\s*$/);
      await expect(profile.communitiesStat).toHaveText(/^\s*Communities\s*0\s*$/);
      // The badge, with what the chain says the member holds of it.
      await expect(pages.profile.badges.section).toContainText("Badges held by Public Paula (1)");
      await expect(pages.profile.badges.amountChip(pages.profile.badges.card(GOVERNOR_BADGE))).toHaveText(
        `1 / ${governorSupply}`,
      );

      // Read-only: nothing to edit, no way to the member's referrals.
      await expect(profile.editButton).toHaveCount(0);
      await expect(profile.manageReferralsLink).toHaveCount(0);
      await expect(pages.profile.editForm).toHaveCount(0);

      // Another member, connected, sees the same page: still read-only, still Paula's.
      await pages.shell.connect();
      await expect(page).toHaveURL(new RegExp(`/user/${someone.address.toLowerCase()}$`));
      await expect(profile.heading("Public Paula")).toBeVisible();
      await expect(profile.associatedAddress(someone.address)).toBeVisible();
      await expect(pages.profile.details).not.toContainText("Viewer Vic");
      await expect(profile.associatedAddress(viewer.address)).toHaveCount(0);
      await expect(profile.editButton).toHaveCount(0);
      await expect(profile.manageReferralsLink).toHaveCount(0);

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "F8: ?edit=true on someone else's profile shows the profile, not an edit form, to a connected member",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet }) => {
      const someone = await actor("member", { name: "Public Pia", bio: "Not yours to edit." });
      const viewer = await persona("member", { name: "Viewer Val", bio: "The viewer's own bio." });
      const profile = new ProfileDetails(page);

      await page.goto(`/user/${someone.address.toLowerCase()}?edit=true`);
      await pages.shell.connect();

      // The form would save the viewer's own profile under Pia's heading:
      // the page ignores the parameter and shows Pia's profile, read-only.
      await expect(pages.profile.details).toBeVisible();
      await expect(profile.heading("Public Pia")).toBeVisible();
      await expect(pages.profile.details).toContainText("Not yours to edit.");
      await expect(profile.associatedAddress(someone.address)).toBeVisible();
      await expect(pages.profile.editForm).toHaveCount(0);
      await expect(profile.editButton).toHaveCount(0);
      await expect(profile.manageReferralsLink).toHaveCount(0);
      await expect(pages.profile.details).not.toContainText("Viewer Val");
      await expect(profile.associatedAddress(viewer.address)).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`/user/${someone.address.toLowerCase()}\\?edit=true$`));

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "F8: ?edit=true on a member's profile shows the profile to a visitor without a wallet, not a prompt to connect",
    { tag: ["@core"] },
    async ({ actor, pages, page }) => {
      const someone = await actor("member", { name: "Public Petra", bio: "Read by a visitor." });
      const profile = new ProfileDetails(page);

      await page.goto(`/user/${someone.address.toLowerCase()}?edit=true`);

      await expect(pages.profile.details).toBeVisible();
      await expect(profile.heading("Public Petra")).toBeVisible();
      await expect(pages.profile.details).toContainText("Read by a visitor.");
      await expect(profile.associatedAddress(someone.address)).toBeVisible();
      await expect(pages.shell.connectPrompt).toHaveCount(0);
      await expect(pages.profile.editForm).toHaveCount(0);
      await expect(profile.editButton).toHaveCount(0);
      await expect(profile.manageReferralsLink).toHaveCount(0);
    },
  );

  test(
    "F8: ?edit=true on the address of the member's own owner wallet does not open an edit form",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet }) => {
      const me = await persona("member", { name: "Owner Otto" });
      const profile = new ProfileDetails(page);

      // The wallet is not the member (F9): the form saves the Society address,
      // so it is not offered on the wallet's page either.
      await page.goto(`/user/${me.ownerAddress.toLowerCase()}?edit=true`);
      await pages.shell.connect();

      await expect(pages.profile.details).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/user/${me.ownerAddress.toLowerCase()}\\?edit=true$`));
      await expect(profile.heading(shortAddress(me.ownerAddress.toLowerCase()))).toBeVisible();
      await expect(pages.profile.details).not.toContainText("Owner Otto");
      await expect(pages.profile.editForm).toHaveCount(0);
      await expect(profile.editButton).toHaveCount(0);

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "F9: /user/<own Society address> leads to /profile; the owner wallet's address does not",
    { tag: ["@core"] },
    async ({ persona, pages, page }) => {
      const me = await persona("member", { name: "Own Olga" });
      const profile = new ProfileDetails(page);

      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toContainText("Own Olga");

      // The address in lowercase, as the app's own links write it.
      await pages.profile.openUser(me.address);
      await expect(page).toHaveURL(/\/profile$/);
      await expect(pages.profile.details).toContainText("Own Olga");
      await expect(profile.editButton).toBeVisible();
      await expect(profile.manageReferralsLink).toBeVisible();

      // With its checksum, as copied from a block explorer.
      await page.goto(`/user/${me.address}`);
      await expect(page).toHaveURL(/\/profile$/);
      await expect(profile.editButton).toBeVisible();

      // The wallet is not the member: its address is somebody without a profile.
      await pages.profile.openUser(me.ownerAddress);
      await expect(pages.profile.details).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/user/${me.ownerAddress.toLowerCase()}$`));
      await expect(profile.heading(shortAddress(me.ownerAddress.toLowerCase()))).toBeVisible();
      await expect(pages.profile.details).toContainText("N/A");
      await expect(pages.profile.details).not.toContainText("Own Olga");
      await expect(profile.editButton).toHaveCount(0);
    },
  );

  test("F10: /user/<something that is not an address> is a 404 page", { tag: ["@core"] }, async ({ page, pages }) => {
    const valid = "0x000000000000000000000000000000000000dEaD";
    for (const notAnAddress of ["not-an-address", "0x1234", `${valid}00`, valid.slice(2)]) {
      await page.goto(`/user/${notAnAddress}`);
      await expect(page.getByRole("heading", { name: "404", exact: true }), notAnAddress).toBeVisible();
      await expect(page.getByRole("heading", { name: "Page Not Found", exact: true })).toBeVisible();
      await expect(pages.profile.details).toHaveCount(0);
    }

    // The way out.
    await page.getByRole("link", { name: "Back to Home" }).click();
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
    await expect(page.getByRole("heading", { name: "404", exact: true })).toHaveCount(0);
  });

  test(
    "F11: /user/<old wallet> shows the old profile until the Society address has one, and then leads there",
    { tag: ["@core"] },
    async ({ pages, page, subgraph }) => {
      const profile = new ProfileDetails(page);
      const { migrated, pending } = await legacyPairsByState(subgraph);
      expect(migrated.length, "old wallets whose Society address has a profile").toBeGreaterThan(0);
      expect(pending.length, "old wallets whose Society address has no profile yet").toBeGreaterThan(0);

      // Not migrated yet: the old wallet's own profile, at the old wallet's address.
      const [old] = pending;
      const oldUser = await subgraph.entity("User", old.wallet);
      expect(oldUser?.profile, "the old wallet's profile badge").toBeTruthy();
      await pages.profile.openUser(old.wallet);
      await expect(pages.profile.details).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/user/${old.wallet}$`));
      await expect(profile.associatedAddress(old.wallet)).toBeVisible();
      await expect(pages.profile.details).toContainText(`#${oldUser!.profile}`);
      await expect(profile.editButton).toHaveCount(0);

      // The member sets up the Society address (here: the subgraph learns of
      // its profile). The old address now leads to the new profile.
      await subgraph.overlay(
        directoryMember({ address: old.society, profileBadgeId: 9_600_001, name: "Moved Mona", bio: "Has moved." }),
      );
      await pages.profile.openUser(old.wallet);
      await expect(page).toHaveURL(new RegExp(`/user/${old.society}$`, "i"));
      await expect(profile.heading("Moved Mona")).toBeVisible();
      await expect(pages.profile.details).toContainText("Has moved.");
      await expect(profile.associatedAddress(old.society)).toBeVisible();
      await expect(profile.associatedAddress(old.wallet)).toHaveCount(0);
      await expect(pages.profile.details).toContainText("#9600001");
      await expect(pages.profile.details).not.toContainText(`#${oldUser!.profile}`);

      // A member who had already moved when the fork was taken.
      const [moved] = migrated;
      const movedUser = await subgraph.entity("User", moved.society);
      await pages.profile.openUser(moved.wallet);
      await expect(page).toHaveURL(new RegExp(`/user/${moved.society}$`, "i"));
      await expect(profile.associatedAddress(moved.society)).toBeVisible();
      await expect(pages.profile.details).toContainText(`#${movedUser!.profile}`);

      // The Society address itself stays where it is.
      await pages.profile.openUser(moved.society);
      await expect(pages.profile.details).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/user/${moved.society}$`));
    },
  );

  test(
    "F12: a migrated member's SPEC balance is read from the old wallet, and the profile says which wallet",
    { tag: ["@edge"] },
    async ({ pages, page, chain, subgraph }) => {
      const profile = new ProfileDetails(page);
      const { symbol } = await specToken(chain);
      const { migrated } = await legacyPairsByState(subgraph);
      expect(migrated.length, "old wallets whose Society address has a profile").toBeGreaterThan(0);
      const [pair] = migrated;

      // SPEC stays on the old wallet. Make that balance one the Society address does not have.
      await setSpecBalance(chain, pair.wallet, 250);
      expect(await specBalance(chain, pair.society)).not.toBe(await specBalance(chain, pair.wallet));

      await pages.profile.openUser(pair.society);
      await expect(pages.profile.details).toBeVisible();
      // "held by wallet", not "held by your wallet": nobody is connected.
      const wallet4 = shortAddress(checksummed(pair.wallet), 4);
      await expect(profile.balanceStat).toHaveText(
        new RegExp(
          `^\\s*Total Balance\\s*250\\s+${literal(symbol)}\\s*held by wallet\\s+${literal(wallet4)}\\s*$`,
          "i",
        ),
      );
      await expect(profile.balanceHolderCaption).toHaveAttribute("title", new RegExp(`^${pair.wallet}$`, "i"));
    },
  );

  test(
    "F12: a member who is not in the legacy map shows the balance of the Society address itself, without a caption",
    { tag: ["@edge"] },
    async ({ actor, pages, page, chain }) => {
      const profile = new ProfileDetails(page);
      const { symbol } = await specToken(chain);
      const someone = await actor("member", { name: "Unmapped Uma" });
      // Different balances on the owner wallet and on the Society address:
      // for someone else the app does not know the owner, and must not guess.
      await setSpecBalance(chain, someone.ownerAddress, 250);
      await setSpecBalance(chain, someone.address, 40);

      await pages.profile.openUser(someone.address);
      await expect(profile.heading("Unmapped Uma")).toBeVisible();
      await expect(profile.balanceStat).toHaveText(new RegExp(`^\\s*Total Balance\\s*40\\s+${literal(symbol)}\\s*$`));
      await expect(profile.balanceHolderCaption).toHaveCount(0);
    },
  );
});
