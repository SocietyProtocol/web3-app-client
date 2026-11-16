import { isAddressEqual, parseEventLogs } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import {
  amountNamed,
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  lastTransactionAsked,
} from "../../support/write-route";

/**
 * Creating a badge as someone whose Light Account does not exist yet.
 *
 * createBadge is not sponsored, so the owner wallet pays, and because the
 * call has to come from the Light Account, the wallet first deploys it:
 * two transactions, announced as two steps. A wallet without ETH is told
 * what the wallet needs. The Light Account is not funded in either case.
 */
test.describe("badge creation: a new user's unsponsored write", () => {
  test(
    "I7: a new user's badge takes two wallet transactions, one to set up the Society account and one to create the badge as it",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, seenText }) => {
      const me = await persona("newFunded");
      const name = `E2E New User Badge ${me.address.slice(2, 8)}`;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(await chain.isContract(me.address), "the Light Account is not deployed").toBe(false);

      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(name);

      const setUp = wallet.holdNext("transaction");
      const action = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.badgeCreate.finishButton.click();

      // Step 1: the wallet deploys its Light Account.
      await setUp.requested;
      await expect(pages.shell.transactionStepNotice).toHaveText(
        "Step 1 of 2: confirm setting up your Society account in your wallet",
      );
      expect(wallet.sendTransactionRequests()).toHaveLength(1);
      expect(await chain.isContract(me.address)).toBe(false);
      setUp.approve();

      // Step 2: the badge, created by the account that now exists, with a
      // gas limit the app estimated against the block of the deployment.
      // (The step's notice is read from what the page has shown, not from
      // the page as it is now: see the last test of this file.)
      await action.requested;
      await expect.poll(() => seenText.matching(/^Step 2 of 2/)).toEqual(["Step 2 of 2: confirm the action in your wallet"]);
      expect(await chain.isContract(me.address), "the Light Account is deployed").toBe(true);
      const asked = lastTransactionAsked(wallet);
      const estimate = await chain.public.estimateGas({ account: asked.from, to: asked.to, data: asked.data });
      expect(BigInt(asked.gas!), "gas limit of the second transaction").toBe((estimate * BigInt(12)) / BigInt(10));
      action.approve();

      await expect(pages.shell.transactionToast("success")).toHaveText("Badge created successfully", { timeout: 60_000 });
      await expect(pages.shell.transactionStepNotice).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // Two transactions and no signature (no metadata was pinned, nothing
      // was sponsored), both paid by the wallet.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, deploysAccount: true },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);

      // The badge's creator is the Light Account.
      const created = parseEventLogs({
        abi: SocietyProtocolBadgesABI,
        eventName: "BadgeCreated",
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
      });
      expect(created).toHaveLength(1);
      expect(created[0].args.name).toBe(name);
      expect(isAddressEqual(created[0].args.creator, me.address), "created by the Light Account").toBe(true);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Step 1 of 2: confirm setting up your Society account" });

      // After "Badge created successfully" the wizard goes to the new badge.
      await expect(page).toHaveURL(new RegExp(`/badges/${created[0].args.id}$`));
      await expect(page.getByRole("heading", { name })).toBeVisible();
    },
  );

  test(
    "I7: the notice of the second step stays for as long as its wallet prompt is open",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, pages, wallet, chain }) => {
      const me = await persona("newFunded");
      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(`E2E Two Steps ${me.address.slice(2, 8)}`);

      const setUp = wallet.holdNext("transaction");
      const action = wallet.holdNext("transaction");
      wallet.clearRequests();
      await pages.badgeCreate.finishButton.click();
      await setUp.requested;
      await expect(pages.shell.transactionStepNotice).toHaveText(
        "Step 1 of 2: confirm setting up your Society account in your wallet",
      );
      setUp.approve();

      // The second prompt is open and stays open: the test does not answer it.
      await action.requested;
      expect(await chain.isContract(me.address)).toBe(true);
      expect(wallet.sendTransactionRequests()).toHaveLength(2);
      const stepOne = pages.shell.transactionStepNotice.filter({ hasText: "Step 1 of 2" });
      const stepTwo = pages.shell.transactionStepNotice.filter({ hasText: "Step 2 of 2" });
      await expect(stepOne).toHaveCount(0);
      await expect(stepTwo).toBeVisible();
    },
  );

  test(
    "I7: a new user without ETH is told what the wallet needs for both transactions, and nothing is sent",
    { tag: ["@smoke", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, seenText }) => {
      const me = await persona("new");
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));

      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(`E2E Unfunded ${me.address.slice(2, 8)}`);
      wallet.clearRequests();
      await pages.badgeCreate.finishButton.click();

      // The message names the wallet and an amount of ETH for the wallet.
      const error = pages.shell.toast("error");
      await expect(error).toHaveText(
        new RegExp(`^Your wallet ${me.ownerAddress} needs about [\\d.]+ ETH to pay the network fee for this action$`),
      );
      expect(amountNamed(await error.innerText())).toBeGreaterThan(BigInt(0));
      await expect(error).not.toContainText(me.address);

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.isContract(me.address)).toBe(false);
      expect(await chain.balance(me.address)).toBe(BigInt(0));

      // Still on the wizard, which can be used again.
      await expect(page).toHaveURL(/\/create-badge$/);
      await expect(pages.badgeCreate.finishButton).toBeEnabled();
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "to pay the network fee for this action" });
    },
  );
});
