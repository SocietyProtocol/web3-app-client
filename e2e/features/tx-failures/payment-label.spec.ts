import { encodeFunctionData, type Address, type Hex } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { encodeExecute } from "../../../src/lib/smart-account";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { REFUSALS } from "../../support/aa/refusals";
import { badgesCallOf } from "../../support/aa/traffic";
import { reachReview } from "../../support/flows/onboarding";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectSponsoredThroughAccount,
  expectedCost,
  feeInUsd,
} from "../../support/write-route";
import { reachProfileSave } from "./steps";

/**
 * Who pays, as the page tells the user before and during a write.
 *
 * Next to a write's button, a line says who pays: "Free - you only sign"
 * when Society sponsors the write, "Paid by your wallet, about $X" when the
 * wallet pays (through its Society account or by itself). While the route
 * is not known the line is absent: the page never calls a write free before
 * it knows. While the wallet is open, the pending toast says what it asks
 * for: a free signature for a sponsored write, a transaction otherwise.
 *
 * The texts are written out here rather than imported from
 * src/lib/payment-label.ts: they are what the user reads.
 */

const FREE = "Free - you only sign";
const PAID = "Paid by your wallet";
const SIGN_PROMPT = "Please sign the request in your wallet. It's free.";
const CONFIRM_PROMPT = "Please confirm the transaction in your wallet";
const SIGN_WAIT = "Waiting for your signature...";
/** "Paid by your wallet, about $0.0123" or "..., about < $0.01". */
const PAID_WITH_FEE = /^Paid by your wallet, about\s*(< \$0\.01|\$\d[\d,]*(\.\d+)?)\s*$/;
/** Anything that tells the user a write costs them nothing. */
const CLAIMS_FREE = /Free - you only sign|It's free/;

/** mintToMultiple([recipient], badgeId, 1, "0x"): the call the Mint tab makes. */
function mintCall(badgeId: bigint, recipient: Address): Hex {
  return encodeFunctionData({
    abi: SocietyProtocolBadgesABI,
    functionName: "mintToMultiple",
    args: [[recipient], badgeId, BigInt(1), "0x"],
  });
}

test.describe("who pays, as the page says it", () => {
  test(
    "O16: creating a profile is labelled free, and the wallet is asked for a free signature",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, seenText }) => {
      const me = await reachReview({ persona, pages });

      // Before the click: the label next to Finish, worked out without
      // asking the wallet for anything.
      await expect(pages.shell.paymentLabel).toHaveText(FREE);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      const uploadSignature = wallet.holdNext("signature");
      const userOperationSignature = wallet.holdNext("signature");
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await uploadSignature.requested;
      uploadSignature.approve();

      // While the wallet asks to sign the user operation, the page says it
      // is a signature, and that it is free.
      await userOperationSignature.requested;
      await expect(pages.shell.transactionToast("pending")).toHaveText(SIGN_PROMPT);
      await expect(pages.onboarding.submitButton).toHaveText(SIGN_WAIT);
      await expect(pages.onboarding.submitButton).toBeDisabled();
      userOperationSignature.approve();

      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText("Onboarding Test");

      // It was free: two signatures (upload, user operation), no
      // transaction, one sponsored createProfile; the wallet held no ETH.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("createProfile");
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));

      expect(await seenText.matching(new RegExp(`${PAID}|${CONFIRM_PROMPT}`))).toEqual([]);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: SIGN_PROMPT });
    },
  );

  test(
    "O17: a mint is labelled as paid by the wallet with its fee, and the wallet is asked to confirm a transaction",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, wallet, aa, chain, seenText }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();

      // The label names who pays and what: the fee of the wallet's
      // transaction to its Society account, in USD.
      const cost = await expectedCost(chain, {
        from: me.ownerAddress,
        to: me.address,
        data: encodeExecute({ to: BADGES_ADDRESS, value: BigInt(0), data: mintCall(badge.id, recipient.address) }),
      });
      await expect(pages.shell.paymentLabel).toHaveText(PAID_WITH_FEE);
      await expect(pages.shell.paymentLabel.getByLabel(await feeInUsd(chain, cost), { exact: true })).toBeVisible();

      // While the wallet is open, the page asks for a transaction, not a signature.
      const prompt = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.badge.mintSubmit.click();
      await prompt.requested;
      await expect(pages.shell.transactionToast("pending")).toHaveText(CONFIRM_PROMPT);
      prompt.approve();

      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The label was true: one transaction from the wallet, no signature,
      // nothing through the bundler, and the recipient holds the badge.
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(1));

      expect(await seenText.matching(CLAIMS_FREE)).toEqual([]);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: CONFIRM_PROMPT });
    },
  );

  test(
    "O18: once Society has refused to sponsor a profile update, the page says the wallet pays",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, chain, seenText }) => {
      const { me, newName } = await reachProfileSave({ persona, pages });
      const badgeId = me.profile!.badgeId;

      // A profile update is sponsored, also for a wallet that holds ETH.
      await expect(pages.shell.paymentLabel).toHaveText(FREE);

      // Society refuses; the wallet is asked to pay instead.
      const refused = await aa.answer(REFUSALS.policyExhausted);
      const payment = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();
      await payment.requested;

      // While that payment waits in the wallet, nothing on screen still
      // says the update is free or waits for a signature: the notice says
      // the wallet pays, and the button waits for the transaction.
      await expect(pages.shell.sponsorshipFallbackNotice).toContainText(
        "Free gas is unavailable right now, so your wallet will pay the network fee for this action",
      );
      await expect(pages.shell.transactionToast("pending")).toHaveCount(0);
      await expect(pages.profile.submitButton).toBeDisabled();
      await expect(pages.profile.submitButton).toHaveText("Signing transaction...");
      expect(refused.hits()).toBeGreaterThan(0);

      // The user declines to pay. The form stays, and its label now says
      // the wallet pays: the last answer from Society was no.
      payment.reject();
      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");
      await expect(pages.shell.sponsorshipFallbackNotice).toHaveCount(0);
      await expect(pages.profile.saveButton).toBeEnabled();
      await expect(pages.shell.paymentLabel).toHaveText(PAID);
      expect(wallet.sendTransactionRequests().map((request) => request.outcome)).toEqual(["rejected"]);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("uri", [badgeId]), "nothing was written").toBe(me.profile!.uri);

      // Society sponsors again: the next try is a free signature, and the
      // wallet pays nothing.
      await refused.lift();
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.profile.saveButton.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText(newName);
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 2 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("updateProfileURI");
      expect(await chain.read("uri", [badgeId])).not.toBe(me.profile!.uri);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Free gas is unavailable right now" });
    },
  );

  test(
    "O19: while the page works out who pays, nothing says the write is free",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, network, seenText }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();

      // A mint's route needs the chain: the page simulates it as the
      // Society account and prices it. Hold the pricing.
      const pricing = network.holdRpc({ method: "eth_estimateGas" });
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toHaveText("Simulating...");
      await expect.poll(() => pricing.hits()).toBeGreaterThan(0);
      await expect(pages.shell.paymentLabel).toHaveCount(0);
      await expect(page.getByText(CLAIMS_FREE)).toHaveCount(0);
      pricing.release();

      // Once it knows, it says the wallet pays.
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.shell.paymentLabel).toHaveText(PAID_WITH_FEE);

      // At no point in between did it call the mint free, and the wallet
      // was asked for nothing.
      expect(await seenText.matching(CLAIMS_FREE)).toEqual([]);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
