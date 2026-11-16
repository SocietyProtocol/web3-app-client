import { CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { badgesCallOf } from "../../support/aa/traffic";
import { expectSponsoredThroughAccount } from "../../support/write-route";
import { openWizard, reachReview } from "../../support/flows/onboarding";

const uploads = (requests: { method: string }[]) => requests.filter((request) => request.method === "PUT");

test.describe("smart-account onboarding: waiting, declining and failing", () => {
  test(
    "C7: while saving, the Finish button says what it is waiting for, step by step",
    { tag: ["@edge", "@sponsored"] },
    async ({ persona, pages, wallet, network, subgraph, chain }) => {
      const me = await reachReview({ persona, pages });
      const finish = pages.onboarding.submitButton;
      await expect(finish).toHaveText("Finish");

      // Every stage is held open so that its label can be read: the two
      // wallet prompts, the page's read of the receipt, and the subgraph.
      const uploadSignature = wallet.holdNext("signature");
      const userOperationSignature = wallet.holdNext("signature");
      const receiptRead = network.holdRpc({ method: "eth_getTransactionReceipt" });
      await subgraph.setMeta({ freeze: true });
      await pages.onboarding.submit();

      await uploadSignature.requested;
      await expect(finish).toHaveText("Uploading to IPFS...");
      await expect(finish).toBeDisabled();
      await expect(pages.onboarding.backButton).toBeDisabled();
      uploadSignature.approve();

      await userOperationSignature.requested;
      // A sponsored save: the wallet is asked for a signature, not a transaction.
      await expect(finish).toHaveText("Waiting for your signature...");
      await expect(finish).toBeDisabled();
      userOperationSignature.approve();

      await expect(finish).toHaveText("Confirming transaction...", { timeout: 60_000 });
      expect(receiptRead.hits()).toBeGreaterThan(0);
      receiptRead.release();

      // The transaction is in a block; only the subgraph is still awaited,
      // and success is not announced before it has caught up.
      await expect(finish).toHaveText("Syncing...");
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);
      await subgraph.unfreeze();

      await expect(pages.shell.transactionToast("success")).toBeVisible();
      await expect(pages.profile.details).toContainText("Onboarding Test");
      await expect(pages.onboarding.form).toBeHidden();
    },
  );

  test(
    "C8: declining the upload signature cancels the save, and Finish works when tried again",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, s3 }) => {
      const me = await reachReview({ persona, pages });
      wallet.clearRequests();
      aa.clear();

      wallet.rejectNextSignature();
      await pages.onboarding.submit();
      // One error toast, and only one (the assertion is strict about that).
      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");

      // Nothing left the browser: no upload, no sponsorship request, no user operation.
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["rejected"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(uploads(await s3.requests())).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(false);

      // Still on the review step, with what was typed, and Finish is live again.
      await expect(pages.onboarding.review).toContainText("Onboarding Test");
      await expect(pages.onboarding.submitButton).toHaveText("Finish");
      await expect(pages.onboarding.submitButton).toBeEnabled();
      await expect(pages.onboarding.backButton).toBeEnabled();

      wallet.clearRequests();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText("Onboarding Test");
      await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
    },
  );

  test(
    "C9: declining the user operation after the upload reports an error, and Finish works when tried again",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, s3 }) => {
      const me = await reachReview({ persona, pages });
      wallet.clearRequests();
      aa.clear();

      // Approve the upload authentication, decline the user operation.
      const uploadSignature = wallet.holdNext("signature");
      const userOperationSignature = wallet.holdNext("signature");
      await pages.onboarding.submit();
      await uploadSignature.requested;
      uploadSignature.approve();
      await userOperationSignature.requested;
      userOperationSignature.reject();

      // One error toast, the transaction's, and only one (the assertion is strict about that).
      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");
      await expect(pages.shell.transactionToast("error")).toBeVisible();
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);

      // The metadata was pinned, sponsorship was granted, and then nothing
      // was submitted: no user operation, no fallback to a wallet transaction.
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok", "rejected"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(uploads(await s3.requests())).toHaveLength(1);
      expect(aa.paymasterCalls().length).toBeGreaterThan(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(false);

      await expect(pages.onboarding.review).toContainText("Onboarding Test");
      await expect(pages.onboarding.submitButton).toHaveText("Finish");
      await expect(pages.onboarding.submitButton).toBeEnabled();

      // Trying again asks for both signatures again and goes through.
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText("Onboarding Test");
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("createProfile");
      expect(uploads(await s3.requests())).toHaveLength(2);
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
    },
  );

  test(
    "C12: on the wrong network the wizard gives way to a prompt to switch, and comes back after the switch",
    { tag: ["@edge"] },
    async ({ persona, pages, wallet, aa }) => {
      await openWizard({ persona, pages });
      await pages.onboarding.fill({ name: "Wrong Network", bio: "Typed before the wallet changed network." });

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      await wallet.setChainId(1);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toContainText("You are connected to the wrong network.");
      await expect(pages.shell.wrongNetworkPrompt).toContainText("Please switch to Sepolia to continue.");
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      // Nothing of the wizard can be used meanwhile.
      await expect(pages.onboarding.nextButton).toBeHidden();
      await expect(pages.onboarding.submitButton).toBeHidden();
      await expect(pages.onboarding.setupPrompt).toBeHidden();

      // Declining the switch in the wallet leaves the prompt, ready to be used again.
      wallet.clearRequests();
      wallet.rejectNextChainSwitch();
      await pages.shell.switchNetworkButton.click();
      await expect.poll(() => wallet.requestsOf("wallet_switchEthereumChain").map((request) => request.outcome)).toEqual([
        "rejected",
      ]);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.shell.switchNetworkButton).toBeEnabled();
      expect(wallet.reportedChainId).toBe(1);

      // Accepting it asks the wallet for Sepolia, and the wizard is back.
      await pages.shell.switchNetworkButton.click();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      expect(
        wallet.requestsOf("wallet_switchEthereumChain").map((request) => [
          Number((request.params as [{ chainId: string }])[0].chainId),
          request.outcome,
        ]),
      ).toEqual([
        [CHAIN_ID, "rejected"],
        [CHAIN_ID, "ok"],
      ]);
      expect(wallet.reportedChainId).toBe(CHAIN_ID);
      await expect(pages.onboarding.form).toBeVisible();
      await expect(pages.onboarding.nextButton).toBeEnabled();

      // None of this signed or sent anything.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);

      // What was typed before the network changed is still there: the guard
      // keeps the wizard mounted, hidden, under the switch prompt.
      await expect(pages.onboarding.nameInput).toHaveValue("Wrong Network");
      await expect(pages.onboarding.bioInput).toHaveValue("Typed before the wallet changed network.");
    },
  );

  test(
    "C13: an expired upload signature is refused, nothing is sent, and Finish works once the clock is right",
    { tag: ["@edge", "@sponsored"] },
    async ({ persona, pages, page, wallet, aa, chain, s3 }) => {
      // The device clock is six minutes slow: the app stamps the upload
      // authentication with it, and the server takes signatures up to five
      // minutes old. This is the real route answering 401, not a stub.
      await page.clock.install({ time: new Date(Date.now() - 6 * 60_000) });
      const me = await reachReview({ persona, pages });
      wallet.clearRequests();
      aa.clear();

      await pages.onboarding.submit();
      await expect(pages.shell.toast("error")).toHaveText("Message expired");

      // The wallet signed the upload authentication and was asked for nothing else.
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(uploads(await s3.requests())).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      await expect(pages.onboarding.submitButton).toHaveText("Finish");
      await expect(pages.onboarding.submitButton).toBeEnabled();

      // With the clock corrected the same click goes through.
      await page.clock.setSystemTime(new Date());
      wallet.clearRequests();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
    },
  );

  test(
    "C13: when pinning the metadata fails the error is shown, nothing is sent, and Finish works once storage is back",
    { tag: ["@edge", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, s3 }) => {
      const me = await reachReview({ persona, pages });
      wallet.clearRequests();
      aa.clear();

      // The storage behind /api/profile is down (the AWS SDK retries a few
      // times; fail them all), so the route answers 500.
      await s3.failNext(10, 500);
      await pages.onboarding.submit();
      await expect(pages.shell.toast("error")).toHaveText("Server error occurred. Please try again later.");

      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(false);
      await expect(pages.onboarding.review).toContainText("Onboarding Test");
      await expect(pages.onboarding.submitButton).toHaveText("Finish");
      await expect(pages.onboarding.submitButton).toBeEnabled();

      // Storage is back.
      await s3.failNext(0);
      wallet.clearRequests();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText("Onboarding Test");
      await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
    },
  );

  test(
    "C14: when the subgraph is more than two minutes behind, the save is still reported as done",
    { tag: ["@edge", "@sponsored"] },
    async ({ persona, pages, page, wallet, aa, subgraph, chain }) => {
      // The page's clock is under the test's control, so the two minutes the
      // app waits for the subgraph pass without waiting for them.
      await page.clock.install();
      const me = await reachReview({ persona, pages });
      // The subgraph stops indexing: its entities and its _meta stay behind.
      await subgraph.setMeta({ stall: true });
      wallet.clearRequests();
      aa.clear();

      await pages.onboarding.submit();
      await expect(pages.onboarding.submitButton).toHaveText("Syncing...", { timeout: 60_000 });
      await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      const badgeId = await chain.profileBadgeId(me.address);
      expect(badgeId).toBeGreaterThan(BigInt(0));

      // Half a minute in, the app has asked the subgraph again and still waits.
      const asked = async () =>
        (await subgraph.requests()).filter((request) => request.operationName === "Status").length;
      const askedBefore = await asked();
      await page.clock.fastForward(30_000);
      await expect.poll(asked).toBeGreaterThan(askedBefore + 1);
      await expect(pages.onboarding.submitButton).toHaveText("Syncing...");
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);

      // Past two minutes it stops waiting and reports the save.
      await page.clock.fastForward(91_000);
      await expect(pages.shell.transactionToast("success")).toBeVisible();
      await expect(pages.shell.transactionToast("success")).toContainText("Transaction successful!");
      await expect(pages.shell.toast("error")).toHaveCount(0);
      await expect(pages.onboarding.form).toBeHidden();
      expect(await subgraph.entity("User", me.address), "the subgraph still has not indexed the profile").toBeNull();

      // Right after "Transaction successful!" the page must not offer the
      // account setup again: the profile exists on chain, and the on-chain
      // profile read is refreshed with the save even though the subgraph
      // still has no profile.
      await expect(pages.onboarding.setupPrompt).toBeHidden();
    },
  );
});
