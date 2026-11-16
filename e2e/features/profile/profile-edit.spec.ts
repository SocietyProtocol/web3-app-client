import { isAddressEqual } from "viem";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { badgesCallOf, deploysSender } from "../../support/aa/traffic";
import { cidOf } from "../../support/backends/s3";
import { ProfileDetails } from "../../support/pages/profile-details";
import { expectNeverAskedToFundSocietyAccount, expectSponsoredThroughAccount } from "../../support/write-route";

/**
 * Editing one's own profile: /profile?edit=true swaps the profile for a
 * form with the avatar, the name and the bio. Saving pins the new metadata
 * and sends updateProfileURI, which Society sponsors: the wallet signs
 * twice and pays nothing.
 *
 * The update that is refused because the day's sponsored updates are used
 * up (D6) is in features/tx-failures/sponsorship-refused.spec.ts.
 */

type UserQuery = {
  user: {
    name: string | null;
    bio: string | null;
    metadata: { name: string | null; bio: string | null } | null;
  } | null;
};

/** What was pinned: the PUT requests the S3 fake has seen. */
const uploads = (requests: { method: string }[]) => requests.filter((request) => request.method === "PUT");

test.describe("profile edit", () => {
  test(
    "D3: a member changes name and bio, and the update is sponsored: two signatures, no transaction",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, pages, page, wallet, aa, chain, s3, graphql, seenText }) => {
      const me = await persona("member", { name: "Edith Before", bio: "The bio before the edit." });
      const badgeId = me.profile!.badgeId;
      const uriBefore = await chain.read("uri", [badgeId]);
      const newName = `Edith After ${me.address.slice(2, 8)}`;
      const newBio = "The bio after the edit.";

      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toContainText("Edith Before");

      // "Edit" leads to the form, which has its own address and holds the current values.
      await pages.profile.startEditing();
      await expect(page).toHaveURL(/[?&]edit=true/);
      await expect(pages.profile.details).toBeHidden();
      await expect(pages.profile.editNameInput).toHaveValue("Edith Before");
      await expect(pages.profile.editBioInput).toHaveValue("The bio before the edit.");
      // Nothing changed yet, so there is nothing to save.
      await expect(pages.profile.saveButton).toBeDisabled();

      await pages.profile.editNameInput.fill(newName);
      await pages.profile.editBioInput.fill(newBio);
      await expect(pages.profile.saveButton).toBeEnabled();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();

      // The app reports success, leaves the form and shows the new profile.
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.editForm).toBeHidden();
      await expect(page).not.toHaveURL(/edit=true/);
      await expect(pages.profile.details).toContainText(newName);
      await expect(pages.profile.details).toContainText(newBio);
      await expect(new ProfileDetails(page).heading(newName)).toBeVisible();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // Who paid: the wallet signed the upload authentication and the user
      // operation, and was never asked for a transaction. Society paid.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 2 },
      );
      // The Light Account exists since the profile was created: nothing is deployed.
      expect(deploysSender(userOperation), "the update does not deploy the account").toBe(false);
      const call = badgesCallOf(userOperation);
      expect(isAddressEqual(call.to, BADGES_ADDRESS)).toBe(true);
      expect(call.functionName).toBe("updateProfileURI");
      expect(call.value).toBe(BigInt(0));

      // On chain the same profile badge points at the new metadata, which
      // is what the app pinned and what the user operation carried.
      expect(await chain.profileBadgeId(me.address)).toBe(badgeId);
      const uriAfter = await chain.read("uri", [badgeId]);
      expect(uriAfter).not.toBe(uriBefore);
      expect(call.args).toEqual([badgeId, uriAfter]);
      expect(await s3.getJson(cidOf(uriAfter))).toMatchObject({ name: newName, bio: newBio });

      // The subgraph has the new values, and so has the page after a reload.
      const { data } = await graphql<UserQuery>("User", { id: me.address.toLowerCase() });
      expect(data?.user?.name ?? data?.user?.metadata?.name).toBe(newName);
      expect(data?.user?.bio ?? data?.user?.metadata?.bio).toBe(newBio);
      await page.reload();
      await expect(pages.profile.details).toContainText(newName);
      await expect(pages.profile.details).toContainText(newBio);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction successful!" });
    },
  );

  test(
    "D4: Cancel leaves the edit form without saving, and the next edit starts from the saved values",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet, aa, chain, s3 }) => {
      const me = await persona("member", { name: "Cara Cancel", bio: "Stays as it is." });
      const uriBefore = await chain.read("uri", [me.profile!.badgeId]);

      await pages.profile.open();
      await pages.shell.connect();
      await pages.profile.startEditing();
      await expect(pages.profile.editNameInput).toHaveValue("Cara Cancel");

      wallet.clearRequests();
      aa.clear();
      const uploadsBefore = uploads(await s3.requests()).length;
      await pages.profile.editNameInput.fill("Changed my mind");
      await pages.profile.editBioInput.fill("Never saved.");
      await expect(pages.profile.saveButton).toBeEnabled();
      await pages.profile.cancelButton.click();

      // Back on the profile, as it was.
      await expect(pages.profile.editForm).toBeHidden();
      await expect(page).not.toHaveURL(/edit=true/);
      await expect(pages.profile.details).toContainText("Cara Cancel");
      await expect(pages.profile.details).toContainText("Stays as it is.");
      await expect(pages.profile.details).not.toContainText("Changed my mind");

      // The form does not keep what was typed.
      await pages.profile.startEditing();
      await expect(pages.profile.editNameInput).toHaveValue("Cara Cancel");
      await expect(pages.profile.editBioInput).toHaveValue("Stays as it is.");
      await expect(pages.profile.saveButton).toBeDisabled();

      // Nothing was signed, uploaded or sent, and the chain is as before.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(uploads(await s3.requests())).toHaveLength(uploadsBefore);
      expect(await chain.read("uri", [me.profile!.badgeId])).toBe(uriBefore);
    },
  );

  test(
    "D4: the browser's Back leaves the edit form, Forward returns to it, and a reload stays in it",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet, aa, chain }) => {
      const me = await persona("member", { name: "Bella Back", bio: "Uses the browser's buttons." });
      const uriBefore = await chain.read("uri", [me.profile!.badgeId]);

      await pages.profile.open();
      await pages.shell.connect();
      await pages.profile.startEditing();
      await expect(page).toHaveURL(/[?&]edit=true/);
      wallet.clearRequests();
      aa.clear();
      await pages.profile.editNameInput.fill("Typed, then left");

      // Back: the profile, unchanged.
      await page.goBack();
      await expect(page).not.toHaveURL(/edit=true/);
      await expect(pages.profile.editForm).toBeHidden();
      await expect(pages.profile.details).toContainText("Bella Back");
      await expect(pages.profile.details).not.toContainText("Typed, then left");

      // Forward: the form again, with the saved values, not what was typed.
      await page.goForward();
      await expect(page).toHaveURL(/[?&]edit=true/);
      await expect(pages.profile.editForm).toBeVisible();
      await expect(pages.profile.editNameInput).toHaveValue("Bella Back");
      await expect(pages.profile.saveButton).toBeDisabled();

      // The form has an address of its own: a reload comes back to it.
      await page.reload();
      await expect(pages.profile.editForm).toBeVisible();
      await expect(page).toHaveURL(/[?&]edit=true/);
      await expect(pages.profile.editNameInput).toHaveValue("Bella Back");
      await expect(pages.profile.editBioInput).toHaveValue("Uses the browser's buttons.");

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("uri", [me.profile!.badgeId])).toBe(uriBefore);
    },
  );

  test(
    "D7: on the wrong network the edit form gives way to a prompt to switch, with a way back to the profile",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet, aa, chain }) => {
      const me = await persona("member", { name: "Nora Network", bio: "Changes network while editing." });
      const profile = new ProfileDetails(page);
      const uriBefore = await chain.read("uri", [me.profile!.badgeId]);

      await pages.profile.open();
      await pages.shell.connect();
      await pages.profile.startEditing();
      await pages.profile.editNameInput.fill("Typed on Sepolia");
      wallet.clearRequests();
      aa.clear();

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      await wallet.setChainId(1);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toContainText("You are connected to the wrong network.");
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      // Nothing of the form can be used meanwhile.
      await expect(pages.profile.editForm).toBeHidden();
      await expect(pages.profile.saveButton).toBeHidden();

      // "Back" leaves edit mode. The profile itself needs no network, so it shows.
      await expect(profile.guardBackButton).toBeVisible();
      await profile.guardBackButton.click();
      await expect(page).not.toHaveURL(/edit=true/);
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(pages.profile.details).toBeVisible();
      await expect(pages.profile.details).toContainText("Nora Network");
      await expect(pages.profile.details).not.toContainText("Typed on Sepolia");

      // Still on the wrong network: "Edit" leads to the prompt, not to the form.
      await pages.profile.editButton.click();
      await expect(page).toHaveURL(/[?&]edit=true/);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.profile.editForm).toBeHidden();

      // Switching from the prompt brings the form, with the saved values.
      await pages.shell.switchNetworkButton.click();
      await expect(pages.profile.editForm).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(pages.profile.editNameInput).toHaveValue("Nora Network");
      expect(wallet.requestsOf("wallet_switchEthereumChain").map((request) => request.outcome)).toEqual(["ok"]);

      // Nothing was signed or sent on the way.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("uri", [me.profile!.badgeId])).toBe(uriBefore);
    },
  );
});
