import { isAddressEqual, zeroAddress } from "viem";
import { expect, test } from "../../fixtures";
import { BadgeActionsPanel } from "../../support/pages/badge-actions";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  lastTransactionAsked,
} from "../../support/write-route";
import { badgeMovementsIn, burnCall, throughAccount, transferCall } from "./steps";

/**
 * The Burn and Transfer tabs of /badges/<id>.
 *
 * Like a mint, neither is sponsored: the member's Light Account (the
 * Society address) is what the badges contract sees acting, and the owner
 * wallet pays with one ordinary transaction to the Light Account's execute.
 * Each takes one unit of the badge from a holder.
 */

test.describe("badge actions: burn and transfer", () => {
  test(
    "H8: burning takes one unit from a holder chosen among the holders, after a confirmation; the last unit removes the holder",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, subgraph, nextAccount, seenText }) => {
      // The holder has two units; the bystander is a member who holds none.
      const [me, bystander] = await Promise.all([
        persona("badgeMinter"),
        actor("member", { name: `Bystander ${nextAccount().address.slice(2, 10)}` }),
      ]);
      const badge = me.badge!;
      const holder = me.holder!;
      await chain.writeBadgesAs(me.address, "mint", [holder.address, badge.id, BigInt(1), "0x"]);
      await subgraph.sync();
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(2));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(2));
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      const holderCard = pages.badge.holders.row(holder.address);
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("2 / 2");
      // This member may mint and burn the badge, not transfer it.
      await expect(actions.tabs).toHaveText(["Mint", "Burn"]);

      await actions.openBurnTab();
      await expect(page.getByText("Burning a badge is irreversible. This action permanently removes the badge.")).toBeVisible();
      await expect(actions.burnSubmit).toHaveText("Burn Badge");
      await expect(actions.burnSubmit).toBeDisabled();

      // The picker offers holders only: the bystander is found by the
      // search and still not offered. The app sends the search text in
      // lower case (a name_contains_nocase filter).
      await actions.burnHolderInput.fill(bystander.profile!.name);
      await expect
        .poll(async () =>
          (await subgraph.requests()).some(
            (request) =>
              request.operationName === "Users" &&
              JSON.stringify(request.variables).includes(bystander.profile!.name.toLowerCase()),
          ),
        )
        .toBe(true);
      await expect(actions.noOptions).toBeVisible();
      await expect(actions.option(bystander.profile!.name)).toHaveCount(0);
      await actions.pickBurnHolder(holder.profile!.name);

      // Not without the confirmation.
      await expect(actions.burnConfirmCheckbox).not.toBeChecked();
      await expect(actions.burnSubmit).toBeDisabled();
      await actions.burnConfirmCheckbox.check();
      await expect(actions.burnSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);
      await expect(pages.badge.gasEstimate).toBeVisible();

      let ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await actions.burnSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge burned successfully", { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction of the owner wallet through its Light Account: burn(holder, badge, 1).
      let receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(burnCall(badge.id, holder.address)).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      let burned = badgeMovementsIn(receipt);
      expect(burned).toHaveLength(1);
      expect(isAddressEqual(burned[0].operator, me.address), "burned by the Light Account").toBe(true);
      expect(isAddressEqual(burned[0].from, holder.address)).toBe(true);
      expect(burned[0].to).toBe(zeroAddress);
      expect(burned[0].badgeId).toBe(badge.id);
      expect(burned[0].amount).toBe(BigInt(1));
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(1));

      // The form is empty again: nothing is burned by a second click.
      await expect(actions.burnConfirmCheckbox).not.toBeChecked();
      await expect(actions.burnSubmit).toBeDisabled();

      // Still a holder, with one unit of one, as the page shows once it is
      // loaded again (without the reload the amount is stale: the burn does
      // not invalidate the chain reads of useBadgeQuantities, the bug H2 had
      // before the mint was fixed).
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("1 / 1");

      // The last unit: the holder is gone from the page, without a reload.
      await actions.openBurnTab();
      await actions.pickBurnHolder(holder.profile!.name);
      await actions.burnConfirmCheckbox.check();
      await expect(actions.burnSubmit).toBeEnabled();
      ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await actions.burnSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge burned successfully", { timeout: 60_000 });
      receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      burned = badgeMovementsIn(receipt);
      expect(burned).toHaveLength(1);
      expect(isAddressEqual(burned[0].from, holder.address)).toBe(true);
      expect(burned[0].to).toBe(zeroAddress);
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(0));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(0));

      await expect(pages.badge.holders.section).toContainText("Holders (0)");
      await expect(pages.badge.holders.section).toContainText("No holders found");
      await expect(holderCard).toHaveCount(0);
      // Nobody left to burn from.
      await expect(actions.burnHolderInput).toBeDisabled();

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge burned successfully" });
    },
  );

  test(
    "H9: transferring moves one unit from a holder to someone who holds none; From and To cannot be the same",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, s3, subgraph, nextAccount, seenText }) => {
      // Both names share a word nobody else has, so one search finds both.
      const word = nextAccount().address.slice(2, 10).toLowerCase();
      const [me, sender, receiver] = await Promise.all([
        persona("fundedMember"),
        actor("member", { name: `Sender ${word}` }),
        actor("member", { name: `Receiver ${word}` }),
      ]);
      // A badge this member may mint and transfer (the badgeMinter persona's badge has no transfer rule).
      const name = `E2E Transferable ${word}`;
      const { uri } = await s3.putJson({ name, description: "A badge that can be transferred, made for one browser test." });
      const badgeId = await chain.createBadge({
        creator: me.address,
        name,
        uri,
        minters: [me.profile!.badgeId],
        transferers: [me.profile!.badgeId],
      });
      await chain.writeBadgesAs(me.address, "mint", [sender.address, badgeId, BigInt(1), "0x"]);
      await subgraph.sync();
      expect(await chain.badgeBalance(sender.address, badgeId)).toBe(BigInt(1));
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badgeId);
      await pages.shell.connect();
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(sender.address))).toHaveText("1 / 1");
      await expect(actions.tabs).toHaveText(["Mint", "Transfer"]);

      await actions.openTransferTab();
      await expect(actions.transferSubmit).toHaveText("Transfer Badge");
      await expect(actions.transferSubmit).toBeDisabled();

      // From: of the two the search finds, only the holder is offered.
      await actions.transferFromInput.fill(word);
      await expect(actions.option(`Sender ${word}`)).toBeVisible();
      await expect(actions.option(`Receiver ${word}`)).toHaveCount(0);
      await actions.option(`Sender ${word}`).click();

      // To: of the same two, only the one who does not hold it.
      await actions.transferToInput.fill(word);
      await expect(actions.option(`Receiver ${word}`)).toBeVisible();
      await expect(actions.option(`Sender ${word}`)).toHaveCount(0);

      // The holder's own address can still be typed into To, and is refused.
      await actions.setTransferTo(sender.address);
      await expect(actions.area.getByText("From and To addresses must be different")).toBeVisible();
      await expect(actions.transferSubmit).toBeDisabled();
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // The receiver, picked from the list.
      const decided = actions.codeRead(receiver.address);
      await actions.pickTransferTo(word, `Receiver ${word}`);
      await expect(actions.area.getByText("From and To addresses must be different")).toHaveCount(0);
      await expect(actions.transferSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);
      await expect(pages.badge.gasEstimate).toBeVisible();
      // A Society address needs no "may be a wallet" hint. Only once the app
      // has read its code: until then there is no hint for any address.
      await decided;
      await expect(actions.walletHints).toHaveCount(0);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await actions.transferSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge transferred successfully", {
        timeout: 60_000,
      });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction of the owner wallet through its Light Account:
      // safeTransferFrom(sender, receiver, badge, 1).
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(transferCall(badgeId, sender.address, receiver.address)).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const moved = badgeMovementsIn(receipt);
      expect(moved).toHaveLength(1);
      expect(isAddressEqual(moved[0].operator, me.address), "moved by the Light Account").toBe(true);
      expect(isAddressEqual(moved[0].from, sender.address)).toBe(true);
      expect(isAddressEqual(moved[0].to, receiver.address)).toBe(true);
      expect(moved[0].badgeId).toBe(badgeId);
      expect(moved[0].amount).toBe(BigInt(1));
      expect(await chain.badgeBalance(sender.address, badgeId)).toBe(BigInt(0));
      expect(await chain.badgeBalance(receiver.address, badgeId)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badgeId)).toBe(BigInt(1));

      // The page: the receiver holds it now, the sender does not.
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      const receiverCard = pages.badge.holders.row(receiver.address);
      await expect(receiverCard).toContainText(`Receiver ${word}`);
      await expect(pages.badge.holderAmountChip(receiverCard)).toHaveText("1 / 1");
      await expect(pages.badge.holders.row(sender.address)).toHaveCount(0);
      // The form is empty again.
      await expect(actions.transferSubmit).toBeDisabled();

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge transferred successfully" });
    },
  );
});
