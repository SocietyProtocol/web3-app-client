import { encodeFunctionData } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { PAYMASTER_PER_SENDER_PER_MINUTE } from "../../../src/lib/aa/rate-limit";
import { encodeCreateProfile, encodeExecute } from "../../../src/lib/smart-account";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { REFUSALS } from "../../support/aa/refusals";
import { AA_RPC_PATH, paymasterStubCall, unsignedUserOperation, type JsonRpcReply } from "../../support/aa/requests";
import type { AaAnswer } from "../../support/aa/traffic";
import { cidOf } from "../../support/backends/s3";
import {
  amountNamed,
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectSponsoredThroughAccount,
  expectedCost,
  lastTransactionAsked,
  shownEth,
} from "../../support/write-route";
import { reachReview } from "../../support/flows/onboarding";
import { reachProfileSave } from "./steps";

/**
 * Society cannot pay for a write it normally sponsors.
 *
 * When the refusal comes before the wallet is asked to sign the user
 * operation, the app sends the same call another way: the owner wallet pays
 * an ordinary transaction to its Light Account's execute, after a notice
 * that says so and what it will cost. The Light Account still makes the
 * call, so the result belongs to the same Society address, and it never
 * needs ETH of its own.
 *
 * The refusals are answers given in the proxy's place (aa.answer); see
 * support/aa/refusals.ts for which of them are copies of the proxy's own
 * and which are modelled.
 */
const REFUSED_BEFORE_SIGNATURE: { id: string; when: string; refusal: AaAnswer }[] = [
  { id: "O1", when: "the sponsorship policy's budget is spent", refusal: REFUSALS.policyExhausted },
  { id: "O1", when: "the member has used up the policy's per-user allowance", refusal: REFUSALS.perUserLimit },
  { id: "O2", when: "the proxy rate-limits the visitor", refusal: REFUSALS.visitorRateLimit },
  { id: "O2", when: "a gateway answers 429 instead of the proxy", refusal: REFUSALS.gatewayRateLimit },
  { id: "D6", when: "the member's daily profile updates are used up", refusal: REFUSALS.dailyProfileUpdateLimit },
  { id: "O10", when: "sponsorship is not configured on the server", refusal: REFUSALS.notConfigured },
];

test.describe("sponsorship refused before the signature", () => {
  for (const { id, when, refusal } of REFUSED_BEFORE_SIGNATURE) {
    test(
      `${id}: when ${when}, the wallet pays for the profile update through the Society account`,
      { tag: [id === "O1" && refusal === REFUSALS.policyExhausted ? "@smoke" : "@core", "@owner-tx"] },
      async ({ persona, pages, wallet, aa, chain, s3, seenText }) => {
        const { me, newName } = await reachProfileSave({ persona, pages });
        const badgeId = me.profile!.badgeId;
        const ownerBalanceBefore = await chain.balance(me.ownerAddress);
        expect(await chain.balance(me.address), "the Light Account holds no ETH").toBe(BigInt(0));

        const refused = await aa.answer(refusal);
        const payment = wallet.holdNext("transaction");
        wallet.clearRequests();
        aa.clear();
        await pages.profile.saveButton.click();

        // The wallet is asked to pay. Until the user answers, the notice
        // says why and names the cost: the fee of the transaction that is
        // waiting in the wallet, in the wallet's ETH.
        await payment.requested;
        const asked = lastTransactionAsked(wallet);
        const cost = await expectedCost(chain, asked);
        await expect(pages.shell.sponsorshipFallbackNotice).toHaveText(
          "Free gas is unavailable right now, so your wallet will pay the network fee for this action " +
            `(about ${shownEth(cost)} ETH). Confirm it in your wallet.`,
        );
        // Society was asked and refused; no user operation was signed or submitted.
        expect(refused.hits(), "calls the refusal answered").toBeGreaterThan(0);
        expect(aa.userOperations()).toHaveLength(0);
        expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
        expect(await chain.read("uri", [badgeId]), "nothing is on chain yet").toBe(me.profile!.uri);
        payment.approve();

        await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
        await expect(pages.shell.sponsorshipFallbackNotice).toHaveCount(0);
        await expect(pages.shell.toast("error")).toHaveCount(0);
        await expect(pages.profile.editForm).toBeHidden();
        await expect(pages.profile.details).toContainText(newName);

        // One signature (the upload authentication) and one transaction,
        // from the wallet to its Light Account, which the wallet paid for.
        const receipt = await expectOwnerPaidThroughAccount(
          { wallet, chain },
          { persona: me, ownerBalanceBefore, signatures: 1 },
        );
        expect(receipt.gasUsed * receipt.effectiveGasPrice, "the fee is within what the notice said").toBeLessThanOrEqual(
          cost,
        );
        expect(aa.userOperations(), "still no user operation").toHaveLength(0);

        // The update is the Light Account's: the same profile badge, which
        // only its owner may change, now points at the new metadata.
        expect(await chain.profileBadgeId(me.address)).toBe(badgeId);
        expect(await chain.profileBadgeId(me.ownerAddress), "the wallet has no profile").toBe(BigInt(0));
        const uri = await chain.read("uri", [badgeId]);
        expect(uri).not.toBe(me.profile!.uri);
        expect(await s3.getJson(cidOf(uri))).toMatchObject({ name: newName });

        await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Free gas is unavailable right now" });
      },
    );
  }

  test(
    "O11: a new user whose profile is not sponsored pays with the wallet: first to set up the Society account, then for the profile",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, chain, s3, seenText }) => {
      const me = await reachReview({ persona, pages, kind: "newFunded" });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(await chain.isContract(me.address), "the Light Account is not deployed").toBe(false);

      const refused = await aa.answer(REFUSALS.policyExhausted);
      const setUp = wallet.holdNext("transaction");
      const action = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();

      // First prompt: the wallet deploys its Light Account. The notice
      // announces both transactions and what they cost together.
      await setUp.requested;
      await expect(pages.shell.sponsorshipFallbackNotice).toHaveText(
        /^Free gas is unavailable right now, so your wallet will pay the network fee for this action \(about [\d.]+ ETH\)\. Confirm two transactions in your wallet: one sets up your Society account, the next sends the action\.$/,
      );
      const announced = amountNamed(await pages.shell.sponsorshipFallbackNotice.innerText());
      expect(refused.hits(), "calls the refusal answered").toBeGreaterThan(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(1);
      expect(await chain.isContract(me.address)).toBe(false);
      setUp.approve();

      // Second prompt: the profile, sent through the account that now
      // exists. The app sets the gas limit itself, from an estimate made
      // against the block of the deployment plus the usual 20%.
      // (The step's notice is read from what the page has shown, not from
      // the page as it is now: it goes away too early, see the I7 test in
      // badge-create/create-badge-routing.spec.ts.)
      await action.requested;
      await expect.poll(() => seenText.matching(/^Step 2 of 2/)).toEqual([
        "Step 2 of 2: confirm the action in your wallet. Free gas is unavailable right now, so your wallet pays the network fee.",
      ]);
      await expect(pages.shell.sponsorshipFallbackNotice).toHaveCount(0);
      expect(await chain.isContract(me.address), "the Light Account is deployed").toBe(true);
      expect(await chain.profileBadgeId(me.address), "the profile is not created yet").toBe(BigInt(0));
      const asked = lastTransactionAsked(wallet);
      const estimate = await chain.public.estimateGas({ account: asked.from, to: asked.to, data: asked.data });
      expect(BigInt(asked.gas!), "gas limit of the second transaction").toBe((estimate * BigInt(12)) / BigInt(10));
      action.approve();

      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.transactionStepNotice).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);
      await expect(pages.profile.details).toContainText("Onboarding Test");

      // One signature (the upload authentication), then the two
      // transactions, both paid by the wallet; no user operation.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1, deploysAccount: true },
      );
      expect(receipt.status).toBe("success");
      expect(aa.userOperations()).toHaveLength(0);
      const paid = ownerBalanceBefore - (await chain.balance(me.ownerAddress));
      expect(paid, "both fees are within what the notice said").toBeLessThanOrEqual(announced);

      // The profile belongs to the Light Account, not to the wallet that paid.
      const badgeId = await chain.profileBadgeId(me.address);
      expect(badgeId).toBeGreaterThan(BigInt(0));
      expect(await chain.badgeBalance(me.address, badgeId)).toBe(BigInt(1));
      expect(await chain.profileBadgeId(me.ownerAddress)).toBe(BigInt(0));
      expect(await s3.getJson(cidOf(await chain.read("uri", [badgeId])))).toMatchObject({ name: "Onboarding Test" });

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Step 2 of 2: confirm the action in your wallet" });
    },
  );

  test(
    "O12: a new user without ETH is told that the wallet cannot pay either, nothing is sent, and the save works once sponsorship is back",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, seenText }) => {
      const me = await reachReview({ persona, pages });
      expect(await chain.balance(me.ownerAddress), "the wallet holds no ETH").toBe(BigInt(0));

      const refused = await aa.answer(REFUSALS.policyExhausted);
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();

      // One error, and it is about the wallet: the address it names is the
      // wallet's, and what it asks for is ETH in the wallet.
      const error = pages.shell.toast("error");
      await expect(error).toHaveText(
        new RegExp(
          `^Free gas is unavailable right now and your wallet ${me.ownerAddress} does not have enough ETH to pay ` +
            "the network fee \\(about [\\d.]+ ETH\\)\\. Add ETH to your wallet or try again later\\.$",
        ),
      );
      expect(amountNamed(await error.innerText())).toBeGreaterThan(BigInt(0));
      await expect(error).not.toContainText(me.address);

      // Only the upload authentication was signed. Nothing was sent, by anyone.
      expect(refused.hits()).toBeGreaterThan(0);
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.isContract(me.address)).toBe(false);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect(await seenText.matching(/Confirm (it|two transactions) in your wallet/)).toEqual([]);
      await expect(pages.onboarding.submitButton).toHaveText("Finish");
      await expect(pages.onboarding.submitButton).toBeEnabled();

      // Sponsorship is back: the same click is free again.
      await refused.lift();
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expectSponsoredThroughAccount({ wallet, aa, chain }, { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 });
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "does not have enough ETH to pay the network fee" });
    },
  );

  for (const stubbed of [true, false]) {
    test(
      stubbed
        ? "O13: a refused write that would revert is reported as that revert and is not sent at the wallet's expense"
        : "O13: a write the bundler refuses because it would revert is not sent at the wallet's expense either",
      { tag: ["@core"] },
      async ({ persona, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
        // The wallet could pay: if the app fell back, a transaction would be asked for.
        const me = await reachReview({ persona, pages, kind: "newFunded" });
        const ownerBalanceBefore = await chain.balance(me.ownerAddress);

        // Meanwhile the same wallet creates its profile somewhere else
        // (another tab, another device), and this page has not heard of it:
        // the subgraph it asks is behind.
        await subgraph.setMeta({ stall: true });
        const { uri: elsewhere } = await s3.putJson({ name: "Made elsewhere", bio: "", imageUrl: null });
        await chain.sendSponsored(me.owner, [{ to: BADGES_ADDRESS, data: encodeCreateProfile(elsewhere) }]);
        const badgeId = await chain.profileBadgeId(me.address);
        expect(badgeId).toBeGreaterThan(BigInt(0));

        const refused = stubbed ? await aa.answer(REFUSALS.policyExhausted) : undefined;
        wallet.clearRequests();
        aa.clear();
        await pages.onboarding.submit();

        // createProfile for an account that has a profile reverts. The app
        // says so; it does not offer to send it from the wallet.
        await expect(pages.shell.toast("error")).toHaveText("Profile already exists");
        await expect(pages.shell.transactionToast("success")).toHaveCount(0);

        if (refused) {
          expect(refused.hits(), "calls the refusal answered").toBeGreaterThan(0);
        } else {
          // Nothing was stubbed here: the local paymaster agreed, and the
          // bundler refused the gas estimate because the call reverts.
          await expect
            .poll(() => aa.refusedCalls().map((call) => call.method))
            .toContain("eth_estimateUserOperationGas");
          expect(aa.paymasterCalls().length).toBeGreaterThan(0);
        }
        expect(wallet.signatureRequests().map((request) => request.outcome), "only the upload was signed").toEqual(["ok"]);
        expect(wallet.sendTransactionRequests(), "no transaction request").toHaveLength(0);
        expect(wallet.sendCallsRequests()).toHaveLength(0);
        expect(aa.userOperations()).toHaveLength(0);
        expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);
        expect(await chain.balance(me.ownerAddress), "the wallet paid nothing").toBe(ownerBalanceBefore);
        expect(await chain.balance(me.address)).toBe(BigInt(0));
        expect(await chain.read("uri", [badgeId]), "the profile made elsewhere is untouched").toBe(elsewhere);

        await expect(pages.onboarding.submitButton).toHaveText("Finish");
        await expect(pages.onboarding.submitButton).toBeEnabled();
        await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Profile already exists" });
      },
    );
  }

  test(
    "O14: declining the wallet payment after a refusal sends nothing, and paying works when tried again",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, chain, seenText }) => {
      const { me, newName } = await reachProfileSave({ persona, pages });
      const badgeId = me.profile!.badgeId;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await aa.answer(REFUSALS.policyExhausted);
      wallet.rejectNextTransaction();
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();

      // One error toast, the user's own answer, and the notice is gone.
      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");
      await expect(pages.shell.sponsorshipFallbackNotice).toHaveCount(0);
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);
      expect(wallet.sendTransactionRequests().map((request) => request.outcome)).toEqual(["rejected"]);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("uri", [badgeId]), "nothing changed on chain").toBe(me.profile!.uri);
      expect(await chain.balance(me.ownerAddress), "the wallet paid nothing").toBe(ownerBalanceBefore);

      // The form is still there with what was typed, and can be sent again.
      await expect(pages.profile.editNameInput).toHaveValue(newName);
      await expect(pages.profile.saveButton).toBeEnabled();
      wallet.clearRequests();
      await pages.profile.saveButton.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText(newName);
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore, signatures: 1 });
      expect(await chain.read("uri", [badgeId])).not.toBe(me.profile!.uri);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Free gas is unavailable right now" });
    },
  );

  test(
    "O15: the proxy itself refuses a sender's sixth request for sponsorship in a minute, and the wallet pays instead",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, api, chain, seenText }) => {
      // Nothing is stubbed in this test: the refusal is the real proxy's.
      const { me, newName } = await reachProfileSave({ persona, pages });
      const badgeId = me.profile!.badgeId;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      const uploadSignature = wallet.holdNext("signature");
      const payment = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();
      await uploadSignature.requested;

      // While the wallet prompt is open, the same visitor (this test's IP)
      // uses up the sender's allowance, the way two more sends in quick
      // succession would: each asks for sponsorship of an updateProfileURI
      // from this Light Account. The proxy answers the first five.
      const request = paymasterStubCall(
        unsignedUserOperation({
          sender: me.address,
          nonce: "0x1",
          callData: encodeExecute({
            to: BADGES_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: SocietyProtocolBadgesABI,
              functionName: "updateProfileURI",
              args: [badgeId, me.profile!.uri],
            }),
          }),
        }),
      );
      const started = Date.now();
      let granted = 0;
      let reply: JsonRpcReply;
      for (;;) {
        reply = (await (await api.post(AA_RPC_PATH, { data: request })).json()) as JsonRpcReply;
        if (reply.error?.code === REFUSALS.senderRateLimit.error.code) break;
        expect(reply.error, "the proxy forwards the call to the paymaster").toBeUndefined();
        granted += 1;
        expect(granted, "the allowance runs out").toBeLessThan(20);
      }
      expect(reply.error).toEqual(REFUSALS.senderRateLimit.error);
      // Five a minute; the bucket gains one more for every twelve seconds this took.
      expect(granted).toBeGreaterThanOrEqual(PAYMASTER_PER_SENDER_PER_MINUTE);
      expect(granted).toBeLessThanOrEqual(PAYMASTER_PER_SENDER_PER_MINUTE + Math.ceil((Date.now() - started) / 12_000));
      uploadSignature.approve();

      // The page's own request for sponsorship is refused by the proxy, so
      // it asks the wallet to pay.
      await payment.requested;
      await expect(pages.shell.sponsorshipFallbackNotice).toContainText(
        "Free gas is unavailable right now, so your wallet will pay the network fee for this action",
      );
      expect(
        aa.refusedCalls().map((call) => call.error),
        "what the proxy answered the page",
      ).toContainEqual(REFUSALS.senderRateLimit.error);
      expect(aa.userOperations()).toHaveLength(0);
      payment.approve();

      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText(newName);
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore, signatures: 1 });
      expect(await chain.read("uri", [badgeId])).not.toBe(me.profile!.uri);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Free gas is unavailable right now" });
    },
  );
});
