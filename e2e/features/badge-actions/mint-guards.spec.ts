import { isAddressEqual } from "viem";
import { CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { link } from "../../support/builders/entities";
import { BadgeDetailPanel } from "../../support/pages/badges-detail";
import { expectNeverAskedToFundSocietyAccount, expectOwnerPaidThroughAccount } from "../../support/write-route";
import { badgeMovementsIn } from "./steps";

/**
 * What stands between the Mint tab and a mint: the user declining in the
 * wallet, the contract refusing the member, and the wallet being on
 * another network.
 */

test.describe("badge actions: mint guards", () => {
  test(
    "H12: declining the transaction in the wallet mints nothing, shows one error, and the mint works when tried again",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, wallet, aa, chain, seenText }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      // While the wallet is asking: the pending toast, and the button is busy.
      wallet.clearRequests();
      aa.clear();
      const prompt = wallet.holdNext("transaction");
      await pages.badge.mintSubmit.click();
      await prompt.requested;
      await expect(pages.shell.transactionToast("pending")).toHaveText("Please confirm the transaction in your wallet");
      await expect(pages.badge.mintSubmit).toHaveText("Minting...");
      await expect(pages.badge.mintSubmit).toBeDisabled();

      // The user declines.
      prompt.reject();
      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");
      await expect(pages.shell.transactionToast("pending")).toHaveCount(0);
      await expect(pages.shell.transactionToast("submitted")).toHaveCount(0);
      await expect(pages.shell.transactionToast("success")).toHaveCount(0);
      expect(wallet.sendTransactionRequests().map((request) => request.outcome)).toEqual(["rejected"]);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.badgeBalance(recipient.address, badge.id), "nothing was minted").toBe(BigInt(0));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(1));
      expect(await chain.balance(me.ownerAddress), "the wallet paid nothing").toBe(ownerBalanceBefore);
      // One error, the user's own answer: no second message about a failed transaction.
      expect(await seenText.matching(/Transaction failed|would fail|An unexpected error/)).toEqual([]);

      // The form is as it was, and the same click now goes through.
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeEnabled();
      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });
      // The earlier error is taken down when the action is tried again.
      await expect(pages.shell.toast("error")).toHaveCount(0);

      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const minted = badgeMovementsIn(receipt);
      expect(minted).toHaveLength(1);
      expect(isAddressEqual(minted[0].to, recipient.address)).toBe(true);
      expect(isAddressEqual(minted[0].operator, me.address)).toBe(true);
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(2));

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "User rejected the request." });
    },
  );

  test(
    "H13: a member the contract does not let mint is told so before anything is sent",
    { tag: ["@edge"] },
    async ({ persona, actor, pages, wallet, aa, chain, subgraph }) => {
      // The page decides from the subgraph who is offered the Mint tab; the
      // contract decides who may mint. Here the subgraph says this member
      // holds the badge that gives the right, and the chain says they do
      // not (an overlay: the subgraph is ahead of, or wrong about, the chain).
      const [me, issuer] = await Promise.all([persona("fundedMember"), actor("badgeMinter")]);
      const badge = issuer.badge!;
      const minterBadge = issuer.profile!.badgeId;
      await subgraph.overlay(link("User", me.address, "badges", [minterBadge.toString()]));
      expect(await chain.badgeBalance(me.address, minterBadge), "not a holder of the minter badge on chain").toBe(BigInt(0));
      expect(await chain.badgeBalance(me.ownerAddress, minterBadge)).toBe(BigInt(0));

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      wallet.clearRequests();
      aa.clear();
      // To themself: their own Society address needs no hint.
      await pages.badge.setMintRecipient(me.address);

      await expect(pages.badge.simulationError).toHaveText("You are not authorized to mint this badge");
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeDisabled();
      await expect(pages.badge.gasEstimate).toHaveCount(0);

      // Nothing was asked of the wallet and nothing was sent anywhere.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.badgeBalance(me.address, badge.id)).toBe(BigInt(0));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(1));
    },
  );

  test(
    "H14: when the wallet changes network in the middle of a mint the tabs give way to a prompt, and the mint can be made after switching back",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, actor, page, pages, wallet, aa, chain }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;
      const detail = new BadgeDetailPanel(page);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      wallet.clearRequests();
      aa.clear();
      await wallet.setChainId(1);
      await expect(detail.actionsWrongNetworkPrompt).toBeVisible();
      await expect(detail.actionsWrongNetworkPrompt).toContainText(
        "Switch to the correct network to perform badge actions",
      );
      // Nothing of the form can be used meanwhile.
      await expect(pages.badge.actionTabs).toHaveCount(0);
      await expect(pages.badge.mintRecipientInput).toHaveCount(0);
      await expect(pages.badge.mintSubmit).toHaveCount(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // Back on Sepolia, through the prompt's own button.
      await detail.actionsWrongNetworkPrompt.getByTestId("wallet-switch-network").click();
      await expect(detail.actionsWrongNetworkPrompt).toHaveCount(0);
      expect(
        wallet.requestsOf("wallet_switchEthereumChain").map((request) => [
          Number((request.params as [{ chainId: string }])[0].chainId),
          request.outcome,
        ]),
      ).toEqual([[CHAIN_ID, "ok"]]);
      expect(wallet.reportedChainId).toBe(CHAIN_ID);
      expect(await chain.badgeBalance(recipient.address, badge.id), "nothing was minted meanwhile").toBe(BigInt(0));

      // The tabs are back and a mint goes through. (The recipient is
      // entered again: this test does not say whether the form should have
      // kept it.)
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(isAddressEqual(badgeMovementsIn(receipt)[0].to, recipient.address)).toBe(true);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(1));
    },
  );
});
