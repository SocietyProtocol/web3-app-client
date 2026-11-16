import { isAddressEqual, type Address } from "viem";
import { LIGHT_ACCOUNT_FACTORY } from "../../../src/lib/smart-account";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { badgesCallOf, deploysSender } from "../../support/aa/traffic";
import { cidOf } from "../../support/backends/s3";
import { expectSponsoredThroughAccount } from "../../support/write-route";

/** "0x1234...abcdef", the way the app shortens an address in headings and cards. */
function shortened(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

test.describe("smart-account onboarding", () => {
  test("C1: /profile without a wallet asks to connect", { tag: ["@smoke"] }, async ({ pages }) => {
    await pages.onboarding.open();
    await expect(pages.shell.connectPrompt).toBeVisible();
    await expect(pages.onboarding.setupPrompt).toBeHidden();
    await expect(pages.onboarding.profileDetails).toBeHidden();
  });

  test(
    "C2: a wallet without a profile is offered the setup, which opens the wizard for its Society address",
    { tag: ["@smoke"] },
    async ({ persona, pages, page, wallet, chain }) => {
      const me = await persona("new");
      await pages.onboarding.open();
      await pages.shell.connect();

      await expect(pages.onboarding.setupPrompt).toBeVisible();
      await expect(pages.onboarding.profileDetails).toBeHidden();
      await pages.onboarding.start();
      await expect(page).toHaveURL(/setupOpen=true/);
      await expect(pages.onboarding.nameInput).toBeVisible();
      await expect(pages.onboarding.nameInput).toHaveValue("");
      await expect(pages.onboarding.bioInput).toHaveValue("");

      // The profile will belong to the Light Account derived from the wallet,
      // not to the wallet: that is the address the wizard names.
      expect(isAddressEqual(me.address, me.ownerAddress)).toBe(false);
      await expect(pages.onboarding.accountHeading).toHaveText(`Account details ${shortened(me.address)}`, {
        ignoreCase: true,
      });

      // Looking at the wizard costs nothing: nothing is signed or sent, and
      // the Light Account still only exists as an address.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await chain.isContract(me.address)).toBe(false);
    },
  );

  test(
    "C16: a click on the setup prompt while the wallet is still being read keeps the wizard open",
    { tag: ["@edge"] },
    async ({ persona, pages, page, network }) => {
      await persona("new");
      // The app reads the wallet's code to decide which identity applies.
      // Keep that read open: this is the moment right after connecting, on a
      // slow RPC. The setup prompt is already offered then.
      const codeRead = network.holdRpc({ method: "eth_getCode" });
      await pages.onboarding.open();
      await pages.shell.connectButton.click();
      await pages.shell.walletOption.click();
      await expect.poll(() => codeRead.hits()).toBeGreaterThan(0);
      await expect(pages.onboarding.setupPrompt).toBeVisible();
      await expect(pages.shell.accountButton).toHaveCount(0);

      await pages.onboarding.startButton.click();
      await expect(page).toHaveURL(/setupOpen=true/);
      await expect(pages.onboarding.form).toBeVisible();

      codeRead.release();
      await expect(pages.shell.accountButton).toBeVisible();
      // A reset of setupOpen is a URL write that nuqs applies up to about
      // 150 ms after the address changed: wait until none is pending, so
      // that the checks below see the state after any such write and cannot
      // pass on the state before it.
      await pages.onboarding.waitForUrlWritesToSettle();

      // The address going from undefined to the Light Account is the
      // identity settling, not a change of account: the wizard the user just
      // opened stays open (it may sit behind the skeleton while the subgraph
      // is asked for the Light Account's User). Profile.tsx used to reset
      // setupOpen here, which also made O7 and O13 flaky under load.
      await expect(page).toHaveURL(/setupOpen=true/);
      await expect(pages.onboarding.form).toBeVisible();
    },
  );

  test(
    "C3: a new user creates a profile with sponsored gas",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, s3, subgraph }) => {
      const me = await persona("new");
      const name = `Ada ${me.address.slice(2, 8)}`;
      const bio = "Made by the onboarding test.";

      // A new user: no ETH anywhere, no Light Account on chain, no profile.
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(false);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect(await subgraph.entity("User", me.address)).toBeNull();

      await pages.onboarding.open();
      await pages.shell.connect();
      await pages.onboarding.start();
      await pages.onboarding.fill({ name, bio });
      await pages.onboarding.toReview();
      await expect(pages.onboarding.review).toContainText(name);
      await expect(pages.onboarding.review).toContainText(bio);
      // The review card names the Society address in full (as the title of the short form).
      await expect(pages.onboarding.review.getByTitle(me.address)).toHaveText(shortened(me.address), {
        ignoreCase: true,
      });

      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();

      // The app reports success and swaps the wizard for the profile.
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.onboarding.profileDetails).toBeVisible();
      await expect(pages.onboarding.profileDetails).toContainText(name);
      await expect(pages.onboarding.profileDetails).toContainText(bio);
      await expect(pages.onboarding.form).toBeHidden();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The wallet was asked for two signatures (the upload authentication
      // and the user operation) and never for a transaction; Society paid.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      const call = badgesCallOf(userOperation);
      expect(isAddressEqual(call.to, BADGES_ADDRESS)).toBe(true);
      expect(call.functionName).toBe("createProfile");
      expect(call.value).toBe(BigInt(0));

      // On chain the profile badge belongs to the Light Account, which the
      // first user operation deployed. The owner wallet has no profile.
      const badgeId = await chain.profileBadgeId(me.address);
      expect(badgeId).toBeGreaterThan(BigInt(0));
      expect(await chain.badgeBalance(me.address, badgeId)).toBe(BigInt(1));
      expect(await chain.read("isProfileBadge", [badgeId])).toBe(true);
      expect(await chain.profileBadgeId(me.ownerAddress)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(true);

      // The token URI on chain is the metadata the app pinned, and it is the
      // URI the user operation carried.
      const uri = await chain.read("uri", [badgeId]);
      expect(call.args).toEqual([uri]);
      expect(await s3.getJson(cidOf(uri))).toMatchObject({ name, bio, imageUrl: null });
    },
  );

  test(
    "C4: the first save deploys the Light Account; the next one, an edit, reuses it",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, s3 }) => {
      const me = await persona("new");
      const name = `Grace ${me.address.slice(2, 8)}`;
      expect(await chain.isContract(me.address)).toBe(false);

      // First save: createProfile through the wizard.
      await pages.onboarding.open();
      await pages.shell.connect();
      await pages.onboarding.start();
      await pages.onboarding.fill({ name, bio: "First version." });
      await pages.onboarding.toReview();
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText(name);
      // Toasts go away by themselves. Wait for this one, so that the success
      // toast further down can only be the second save's.
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);

      // Its user operation carries the Light Account factory, with the
      // wallet as the account's owner: that is what deployed the account.
      const first = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(deploysSender(first), "the first user operation deploys its sender").toBe(true);
      expect(isAddressEqual(first.factory as Address, LIGHT_ACCOUNT_FACTORY)).toBe(true);
      expect(first.factoryData!.toLowerCase()).toContain(me.ownerAddress.slice(2).toLowerCase());
      expect(badgesCallOf(first).functionName).toBe("createProfile");
      expect(await chain.isContract(me.address)).toBe(true);
      const badgeId = await chain.profileBadgeId(me.address);
      expect(badgeId).toBeGreaterThan(BigInt(0));
      const firstUri = await chain.read("uri", [badgeId]);

      // Second save: the member edits the profile.
      const newName = `${name} II`;
      const newBio = "Second version.";
      await pages.profile.startEditing();
      await expect(pages.profile.editNameInput).toHaveValue(name);
      await expect(pages.profile.editBioInput).toHaveValue("First version.");
      // Nothing changed yet, so there is nothing to save.
      await expect(pages.profile.saveButton).toBeDisabled();
      await pages.profile.editNameInput.fill(newName);
      await pages.profile.editBioInput.fill(newBio);

      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.editForm).toBeHidden();
      await expect(pages.profile.details).toContainText(newName);
      await expect(pages.profile.details).toContainText(newBio);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // Sponsored again, and this time without a factory: the account exists.
      const second = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(deploysSender(second), "the second user operation does not deploy").toBe(false);
      expect(second.factoryData ?? "0x").toBe("0x");
      const update = badgesCallOf(second);
      expect(update.functionName).toBe("updateProfileURI");
      expect(isAddressEqual(update.to, BADGES_ADDRESS)).toBe(true);

      // The same profile badge now points at the new metadata.
      expect(await chain.profileBadgeId(me.address)).toBe(badgeId);
      const secondUri = await chain.read("uri", [badgeId]);
      expect(secondUri).not.toBe(firstUri);
      expect(update.args).toEqual([badgeId, secondUri]);
      expect(await s3.getJson(cidOf(secondUri))).toMatchObject({ name: newName, bio: newBio });
    },
  );

  test(
    "C15: a member who comes back sees the profile, not the setup, also after a reload",
    { tag: ["@smoke"] },
    async ({ persona, pages, page, wallet, aa }) => {
      const me = await persona("member", { name: "Returning Rita", bio: "Was here before." });

      await pages.onboarding.open();
      await expect(pages.shell.connectPrompt).toBeVisible();
      await pages.shell.connect();

      await expect(pages.profile.details).toBeVisible();
      await expect(pages.profile.details).toContainText("Returning Rita");
      await expect(pages.profile.details).toContainText("Was here before.");
      await expect(pages.profile.details).toContainText(`#${me.profile!.badgeId}`);
      await expect(pages.profile.details.getByTitle(me.address)).toBeVisible();
      await expect(pages.onboarding.setupPrompt).toBeHidden();
      await expect(pages.onboarding.form).toBeHidden();

      // The address of the wizard does not open it for someone who has a profile.
      await page.goto("/profile?setupOpen=true");
      await expect(pages.profile.details).toContainText("Returning Rita");
      await expect(pages.onboarding.form).toBeHidden();
      await expect(pages.onboarding.setupPrompt).toBeHidden();

      // A reload keeps the wallet connected: no picker, no connect prompt.
      const connectionsBefore = wallet.requestsOf("eth_requestAccounts").length;
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(pages.profile.details).toContainText("Returning Rita");
      await expect(pages.shell.connectPrompt).toBeHidden();
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(connectionsBefore);

      // Coming back asks the wallet for nothing and sends nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
    },
  );
});
