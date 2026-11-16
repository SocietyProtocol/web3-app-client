import { isAddressEqual, parseEventLogs, zeroAddress } from "viem";
import { entryPoint07Abi } from "viem/account-abstraction";
import { encodeCreateProfile } from "../../../src/lib/smart-account";
import { BADGES_ADDRESS, ENTRY_POINT_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { ALREADY_DEPLOYED, BUNDLER_REJECTIONS, REFUSALS } from "../../support/aa/refusals";
import type { AaAnswer } from "../../support/aa/traffic";
import { badgesCallOf } from "../../support/aa/traffic";
import { expectNeverAskedToFundSocietyAccount, expectSponsoredThroughAccount } from "../../support/write-route";
import { reachReview } from "../../support/flows/onboarding";
import { reachProfileSave } from "./steps";

const EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

/**
 * The sponsored route: the wallet only signs, Society's paymaster pays.
 *
 * The wallet paying instead is reserved for one case: Society refused
 * before the wallet was asked to sign the user operation (see
 * sponsorship-refused.spec.ts). Everything here is on the other side of
 * that line: the user said no, or the failure came after the signature,
 * when the operation may already be on its way. Then the app reports the
 * failure and asks the wallet for nothing, even when the wallet holds ETH.
 */
test.describe("the sponsored route", () => {
  test(
    "O8: a sponsored write only asks for signatures, also from a wallet that holds ETH, and its toasts link to the transaction on the Sepolia explorer",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, network, seenText }) => {
      const { me, newName } = await reachProfileSave({ persona, pages }, "fundedMember");
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(ownerBalanceBefore, "the wallet could pay").toBeGreaterThan(BigInt(0));

      // The page's read of the receipt is held, to look at the toast that
      // is only there until the transaction is confirmed.
      const receiptRead = network.holdRpc({ method: "eth_getTransactionReceipt" });
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();

      await expect(pages.shell.transactionToast("submitted")).toHaveText("Transaction submitted", { timeout: 60_000 });
      const submittedHref = await pages.shell.explorerLink("submitted").getAttribute("href");
      expect(submittedHref).toMatch(new RegExp(`^${EXPLORER_TX}0x[0-9a-f]{64}$`));
      await expect(pages.shell.explorerLink("submitted")).toHaveAttribute("target", "_blank");
      receiptRead.release();

      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.explorerLink("success")).toHaveAttribute("href", submittedHref!);
      await expect(pages.profile.details).toContainText(newName);

      // Signatures only: the upload authentication and the user operation.
      // The wallet's ETH is where it was.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 2 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("updateProfileURI");

      // The linked transaction is the one that carried the user operation:
      // the EntryPoint ran an operation of this Light Account in it, paid
      // for by a paymaster.
      const receipt = await chain.receipt(submittedHref!.slice(EXPLORER_TX.length) as `0x${string}`);
      const operations = parseEventLogs({
        abi: entryPoint07Abi,
        eventName: "UserOperationEvent",
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, ENTRY_POINT_ADDRESS)),
      });
      expect(operations).toHaveLength(1);
      expect(isAddressEqual(operations[0].args.sender, me.address)).toBe(true);
      expect(operations[0].args.success).toBe(true);
      expect(operations[0].args.paymaster).not.toBe(zeroAddress);
      expect(isAddressEqual(receipt.from, me.ownerAddress), "not sent by the wallet").toBe(false);

      // Nothing ever suggested that the wallet would pay, or that the account needs ETH.
      expect(await seenText.matching(/Free gas is unavailable|your wallet (will pay|pays)/i)).toEqual([]);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction submitted" });
    },
  );

  test(
    "O14: declining the user operation's signature is the user's answer: the wallet is not asked to pay instead",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, seenText }) => {
      const { me, newName } = await reachProfileSave({ persona, pages }, "fundedMember");
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      // Approve the upload authentication, decline the user operation.
      const uploadSignature = wallet.holdNext("signature");
      const userOperationSignature = wallet.holdNext("signature");
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();
      await uploadSignature.requested;
      uploadSignature.approve();
      await userOperationSignature.requested;
      userOperationSignature.reject();

      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);

      // Sponsorship had been granted. After the "no" nothing was submitted
      // and the wallet, which holds ETH, was not asked for a transaction.
      expect(aa.paymasterCalls().length).toBeGreaterThan(0);
      expect(aa.refusedCalls(), "the proxy refused nothing").toEqual([]);
      expect(aa.userOperations()).toHaveLength(0);
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok", "rejected"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);
      expect(await chain.read("uri", [me.profile!.badgeId])).toBe(me.profile!.uri);
      expect(await chain.balance(me.ownerAddress)).toBe(ownerBalanceBefore);

      await expect(pages.profile.editNameInput).toHaveValue(newName);
      await expect(pages.profile.saveButton).toBeEnabled();
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "User rejected the request." });
    },
  );

  const REJECTED_AFTER_SIGNATURE: { id: string; when: string; rejection: AaAnswer; message: string }[] = [
    {
      id: "O3",
      when: "the bundler says the fee was not covered (AA21)",
      rejection: BUNDLER_REJECTIONS.prefundNotPaid,
      message: "The network fee for this action could not be covered. Please try again.",
    },
    {
      id: "O4",
      when: "the account's nonce is in use by another action (AA25)",
      rejection: BUNDLER_REJECTIONS.nonceInUse,
      message: "Your Society account has another action in progress. Wait for it to finish and try again.",
    },
    {
      id: "O5",
      when: "the account does not accept the wallet's signature (AA24)",
      rejection: BUNDLER_REJECTIONS.signatureRejected,
      message:
        "Your wallet's signature was not accepted for your Society account. Make sure the wallet that owns it is connected.",
    },
    {
      id: "O1",
      when: "the paymaster's signature is refused (AA34)",
      rejection: BUNDLER_REJECTIONS.paymasterSignatureRejected,
      message: "Society could not sponsor this action. Please try again later or ask an admin.",
    },
  ];

  for (const { id, when, rejection, message } of REJECTED_AFTER_SIGNATURE) {
    test(
      `${id}: when ${when} after the wallet signed, the error is shown and the wallet is not asked to pay`,
      { tag: ["@edge", "@sponsored"] },
      async ({ persona, pages, wallet, aa, chain, seenText }) => {
        const { me, newName } = await reachProfileSave({ persona, pages }, "fundedMember");
        const ownerBalanceBefore = await chain.balance(me.ownerAddress);

        const rejected = await aa.answer(rejection);
        wallet.clearRequests();
        aa.clear();
        await pages.profile.saveButton.click();

        // One error toast, in the app's words.
        await expect(pages.shell.toast("error")).toHaveText(message);
        await expect(pages.shell.transactionToast("success")).toHaveCount(0);

        // The wallet signed both requests; the signed operation was
        // submitted once and rejected. It is not sent again as a wallet
        // transaction: the first one might still go through.
        expect(rejected.methods()).toEqual(["eth_sendUserOperation"]);
        expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok", "ok"]);
        expect(wallet.sendTransactionRequests()).toHaveLength(0);
        expect(wallet.sendCallsRequests()).toHaveLength(0);
        expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);
        expect(await chain.read("uri", [me.profile!.badgeId])).toBe(me.profile!.uri);
        expect(await chain.balance(me.ownerAddress)).toBe(ownerBalanceBefore);
        expect(await chain.balance(me.address)).toBe(BigInt(0));

        await expect(pages.profile.editNameInput).toHaveValue(newName);
        await expect(pages.profile.saveButton).toBeEnabled();
        await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: message });
      },
    );
  }

  test(
    "O6: a gas estimate refused because a lagging node still sees the account as undeployed (AA10) is retried, and the write stays sponsored",
    { tag: ["@edge", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, seenText }) => {
      // A member without ETH: if the app took the refusal for "Society
      // cannot pay", this wallet could not pay either.
      const { me, newName } = await reachProfileSave({ persona, pages }, "member");
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));

      const lagging = await aa.answer(ALREADY_DEPLOYED, { times: 1 });
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();

      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);
      await expect(pages.profile.details).toContainText(newName);

      // The first estimate was refused, the second went through, and the
      // user saw one prompt per signature: nothing was asked twice.
      expect(lagging.hits()).toBe(1);
      expect(aa.callsOf("eth_estimateUserOperationGas")).toHaveLength(2);
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("updateProfileURI");
      expect(await chain.read("uri", [me.profile!.badgeId])).not.toBe(me.profile!.uri);
      expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction submitted" });
    },
  );

  test(
    "O7: a wallet-paid transaction that reverts on chain is reported as failed, and the form can be used again",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, chain, s3, subgraph }) => {
      // A new user pays with the wallet (sponsorship refused): the Light
      // Account is set up first, then the profile is sent with a gas limit
      // the app fixed beforehand. That second transaction can no longer be
      // stopped by a failing estimate in the wallet.
      const me = await reachReview({ persona, pages, kind: "newFunded" });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      await aa.answer(REFUSALS.policyExhausted);
      const setUp = wallet.holdNext("transaction");
      const action = wallet.holdNext("transaction");
      wallet.clearRequests();
      await pages.onboarding.submit();
      await setUp.requested;
      setUp.approve();
      await action.requested;

      // While the second prompt is open, the same wallet creates its profile
      // somewhere else. The transaction waiting in the wallet will now revert.
      await subgraph.setMeta({ stall: true });
      const { uri: elsewhere } = await s3.putJson({ name: "Made elsewhere", bio: "", imageUrl: null });
      await chain.sendSponsored(me.owner, [{ to: BADGES_ADDRESS, data: encodeCreateProfile(elsewhere) }]);
      const badgeId = await chain.profileBadgeId(me.address);
      action.approve();

      await expect(pages.shell.transactionToast("error")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);

      // It was mined and it reverted; the wallet paid for both transactions.
      const sends = wallet.sendTransactionRequests();
      expect(sends.map((request) => request.outcome)).toEqual(["ok", "ok"]);
      const reverted = await chain.receiptOf(sends[1].hash!);
      expect(reverted.status).toBe("reverted");
      expect(isAddressEqual(reverted.to!, me.address)).toBe(true);
      const deployed = await chain.receipt(sends[0].hash!);
      expect(ownerBalanceBefore - (await chain.balance(me.ownerAddress))).toBe(
        deployed.gasUsed * deployed.effectiveGasPrice + reverted.gasUsed * reverted.effectiveGasPrice,
      );
      expect(await chain.read("uri", [badgeId]), "the profile made elsewhere is untouched").toBe(elsewhere);

      // The form can be used again.
      await expect(pages.onboarding.submitButton).toHaveText("Finish");
      await expect(pages.onboarding.submitButton).toBeEnabled();

      // The toast names the contract's error (ProfileAlreadyExists(),
      // selector 0x6e8a1b0a) in the app's wording, as it does when the same
      // call is refused before it is sent (O13). wagmi's wait for the receipt
      // replays the reverted transaction without an ABI; useTransaction
      // decodes that raw revert with the ABI of the call it sent.
      await expect(pages.shell.transactionToast("error")).toHaveText("Profile already exists");
    },
  );
});
