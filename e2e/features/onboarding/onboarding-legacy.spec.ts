import { isAddressEqual } from "viem";
import { expect, test } from "../../fixtures";
import { badgesCallOf, deploysSender } from "../../support/aa/traffic";
import { cidOf } from "../../support/backends/s3";
import { expectNeverAskedToFundSocietyAccount, expectSponsoredThroughAccount } from "../../support/write-route";

/**
 * Members from before smart accounts ("legacy"): their profile belongs to
 * the wallet itself, and the app knows which Light Account each of those
 * wallets moved to from a map that is compiled into the bundle
 * (src/consts/legacy-account-map.json, read by
 * src/components/shared/legacyAccounts.ts).
 *
 * The committed map cannot hold test wallets (they come from a public
 * mnemonic, and an entry in the Sepolia map would hand that legacy identity
 * on staging to anyone), so the suite's build adds a fixed pool of them
 * through NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS (src/lib/e2e-legacy-accounts.ts,
 * e2e/env/hermetic.json). `persona("legacy")` takes the first wallet of the
 * pool whose Light Account has no profile yet:
 *
 *   - `owner` / `ownerAddress`: the wallet; it holds a profile on chain,
 *     created by the wallet itself, with the name and bio given in the
 *     persona's options and no picture;
 *   - `address`: its Light Account, not deployed and without a profile;
 *   - `profile` unset (it describes the Society address, which has none).
 *
 * C11 uses a wallet up (its Light Account gets a profile); C10 does not.
 */

/** "0x1234...abcdef", the way the app shortens an address in headings and cards. */
function shortened(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

const OLD_NAME = "Old Timer";
const OLD_BIO = "A member since before smart accounts.";

test.describe("smart-account onboarding: members from before smart accounts", () => {
  test(
    "C10: a legacy wallet connects, sees its Society address, and the wizard is prefilled from the old profile",
    { tag: ["@core"] },
    async ({ persona, pages, wallet, chain, subgraph }) => {
      const me = await persona("legacy", { name: OLD_NAME, bio: OLD_BIO });

      // The starting point: the profile is the wallet's; its Light Account
      // is only an address.
      expect(isAddressEqual(me.address, chain.societyAddress(me.ownerAddress))).toBe(true);
      expect(await chain.profileBadgeId(me.ownerAddress)).toBeGreaterThan(BigInt(0));
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(false);
      expect(await subgraph.entity("User", me.address)).toBeNull();

      await pages.onboarding.open();
      await pages.shell.connect();

      // The account is the Light Account; the wallet is its owner.
      const menu = await pages.shell.readAccountMenu();
      expect(menu.society?.toLowerCase()).toBe(me.address.toLowerCase());
      expect(menu.owner?.toLowerCase()).toBe(me.ownerAddress.toLowerCase());

      // /profile is about the Society address, which has no profile yet:
      // the setup is offered, the old profile is not shown as the member's.
      await expect(pages.onboarding.setupPrompt).toBeVisible();
      await expect(pages.onboarding.profileDetails).toBeHidden();

      // The wizard is for the Society address and starts from what the
      // member had entered for the old wallet.
      await pages.onboarding.start();
      await expect(pages.onboarding.accountHeading).toHaveText(`Account details ${shortened(me.address)}`, {
        ignoreCase: true,
      });
      await expect(pages.onboarding.nameInput).toHaveValue(OLD_NAME);
      await expect(pages.onboarding.bioInput).toHaveValue(OLD_BIO);
      await expect(pages.onboarding.nextButton).toBeEnabled();
      await pages.onboarding.toReview();
      await expect(pages.onboarding.review).toContainText(OLD_NAME);
      await expect(pages.onboarding.review).toContainText(OLD_BIO);

      // Looking costs nothing and changes nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
    },
  );

  test(
    "C11: a legacy member saves, and /user/<old wallet> then leads to the Society address",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, page, wallet, aa, chain, s3, seenText }) => {
      const me = await persona("legacy", { name: OLD_NAME, bio: OLD_BIO });
      const oldBadgeId = await chain.profileBadgeId(me.ownerAddress);
      expect(oldBadgeId).toBeGreaterThan(BigInt(0));
      const oldUri = await chain.read("uri", [oldBadgeId]);
      const oldWalletPage = new RegExp(`/user/${me.ownerAddress}$`, "i");
      const societyPage = new RegExp(`/user/${me.address}$`, "i");

      // Before the move the old wallet's page shows the old profile and stays where it is.
      await pages.profile.openUser(me.ownerAddress);
      await expect(pages.profile.details).toContainText(OLD_NAME);
      await expect(page).toHaveURL(oldWalletPage);

      // The member connects and saves the prefilled profile under a new name.
      const newName = "Moved In";
      await pages.onboarding.open();
      await pages.shell.connect();
      await pages.onboarding.start();
      await expect(pages.onboarding.nameInput).toHaveValue(OLD_NAME);
      await pages.onboarding.fill({ name: newName });
      await pages.onboarding.toReview();
      await expect(pages.onboarding.review).toContainText(newName);
      await expect(pages.onboarding.review).toContainText(OLD_BIO);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.onboarding.profileDetails).toContainText(newName);
      await expect(pages.onboarding.profileDetails).toContainText(OLD_BIO);

      // A sponsored createProfile from the Light Account, which the same
      // user operation deployed: two signatures, no transaction.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 2 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("createProfile");
      expect(deploysSender(userOperation)).toBe(true);

      // On chain the Society address has its own profile now, with the new
      // metadata; the old wallet's profile is untouched.
      const newBadgeId = await chain.profileBadgeId(me.address);
      expect(newBadgeId).toBeGreaterThan(BigInt(0));
      expect(newBadgeId).not.toBe(oldBadgeId);
      expect(await s3.getJson(cidOf(await chain.read("uri", [newBadgeId])))).toMatchObject({
        name: newName,
        bio: OLD_BIO,
      });
      expect(await chain.profileBadgeId(me.ownerAddress)).toBe(oldBadgeId);
      expect(await chain.read("uri", [oldBadgeId])).toBe(oldUri);

      // For the member, the old wallet's address now leads to their own profile page.
      await pages.profile.openUser(me.ownerAddress);
      await expect(page).toHaveURL(/\/profile$/);
      await expect(pages.profile.details).toContainText(newName);

      // For everyone else it leads to the Society address and the new profile.
      await wallet.disconnect();
      await expect(pages.shell.connectButton).toBeVisible();
      await pages.profile.openUser(me.ownerAddress);
      await expect(page).toHaveURL(societyPage);
      await expect(pages.profile.details).toContainText(newName);
      await expect(pages.profile.details).not.toContainText(OLD_NAME);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction submitted" });
    },
  );
});
