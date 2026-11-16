import { isAddressEqual, zeroAddress } from "viem";
import { expect, test } from "../../fixtures";
import { badge as badgeEntity } from "../../support/builders/entities";
import { BadgeActionsPanel } from "../../support/pages/badge-actions";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  lastTransactionAsked,
} from "../../support/write-route";
import { badgeMovementsIn, burnCall, throughAccount, transferCall } from "./steps";

/**
 * The amount of a burn or a transfer (ERC-1155: a holder can own several
 * copies of a badge). The Burn and Transfer tabs offer "Amount" once the
 * chosen holder has more than one copy, capped at their on-chain balance;
 * a holder of one copy, and a profile badge, always move one.
 *
 * The holder list comes from the subgraph fake, which keeps a holder while
 * their balance is above 0 (like the real mapping); the amounts on the
 * cards are the page's own chain reads.
 */

type Fixtures = Parameters<Parameters<typeof test>[2]>[0];

/**
 * A badge `me` (a funded member) may mint, transfer and burn, and `copies`
 * copies of it on `holder`.
 */
async function badgeWithCopies(
  { chain, s3, subgraph }: Pick<Fixtures, "chain" | "s3" | "subgraph">,
  me: { address: `0x${string}`; profile?: { badgeId: bigint } },
  holder: `0x${string}`,
  copies: bigint,
  word: string,
): Promise<bigint> {
  const name = `E2E Copies ${word}`;
  const { uri } = await s3.putJson({ name, description: "A badge with several copies, made for one browser test." });
  const rule = [me.profile!.badgeId];
  const badgeId = await chain.createBadge({ creator: me.address, name, uri, minters: rule, transferers: rule, burners: rule });
  await chain.writeBadgesAs(me.address, "mint", [holder, badgeId, copies, "0x"]);
  await subgraph.sync();
  expect(await chain.badgeBalance(holder, badgeId)).toBe(copies);
  return badgeId;
}

test.describe("badge actions: burn and transfer an amount", () => {
  test(
    "H15: burning 2 of a holder's 3 copies leaves 1 on chain, and the holder stays listed with 1",
    { tag: ["@smoke", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, s3, subgraph, nextAccount, seenText }) => {
      const word = nextAccount().address.slice(2, 10).toLowerCase();
      const [me, holder] = await Promise.all([
        persona("fundedMember"),
        actor("member", { name: `Holder ${word}` }),
      ]);
      const badgeId = await badgeWithCopies({ chain, s3, subgraph }, me, holder.address, BigInt(3), word);
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badgeId);
      await pages.shell.connect();
      const holderCard = pages.badge.holders.row(holder.address);
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("3 / 3");
      await expect(actions.tabs).toHaveText(["Mint", "Transfer", "Burn"]);

      await actions.openBurnTab();
      // No amount before a holder is chosen.
      await expect(actions.amountInput).toHaveCount(0);
      await actions.pickBurnHolder(`Holder ${word}`);
      await expect(actions.amountInput).toHaveValue("1");
      await expect(actions.amountInput).toHaveAccessibleDescription("Holds 3");
      await actions.amountInput.fill("2");
      await actions.burnConfirmCheckbox.check();
      await expect(actions.burnSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);
      await expect(pages.badge.gasEstimate).toBeVisible();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await actions.burnSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge burned successfully", { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction of the owner wallet through its Light Account: burn(holder, badge, 2).
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(burnCall(badgeId, holder.address, BigInt(2))).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const burned = badgeMovementsIn(receipt);
      expect(burned).toHaveLength(1);
      expect(isAddressEqual(burned[0].from, holder.address)).toBe(true);
      expect(burned[0].to).toBe(zeroAddress);
      expect(burned[0].badgeId).toBe(badgeId);
      expect(burned[0].amount).toBe(BigInt(2));
      expect(await chain.badgeBalance(holder.address, badgeId)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badgeId)).toBe(BigInt(1));

      // The subgraph keeps a holder whose balance is above 0, and the page
      // reads the new amounts again after the burn: no reload needed.
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("1 / 1");
      // The form is empty again, the amount with it.
      await expect(actions.burnSubmit).toBeDisabled();
      await expect(actions.amountInput).toHaveCount(0);

      // And the same after a reload.
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("1 / 1");

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge burned successfully" });
    },
  );

  test(
    "H16: transferring 2 of a holder's 3 copies moves exactly 2",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, s3, subgraph, nextAccount, seenText }) => {
      const word = nextAccount().address.slice(2, 10).toLowerCase();
      const [me, sender, receiver] = await Promise.all([
        persona("fundedMember"),
        actor("member", { name: `Sender ${word}` }),
        actor("member", { name: `Receiver ${word}` }),
      ]);
      const badgeId = await badgeWithCopies({ chain, s3, subgraph }, me, sender.address, BigInt(3), word);
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badgeId);
      await pages.shell.connect();
      const senderCard = pages.badge.holders.row(sender.address);
      await expect(pages.badge.holderAmountChip(senderCard)).toHaveText("3 / 3");

      await actions.openTransferTab();
      await actions.pickTransferFrom(word, `Sender ${word}`);
      await expect(actions.amountInput).toHaveAccessibleDescription("Holds 3");
      await actions.pickTransferTo(word, `Receiver ${word}`);
      await actions.amountInput.fill("2");
      await expect(actions.transferSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);
      await expect(pages.badge.gasEstimate).toBeVisible();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await actions.transferSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge transferred successfully", {
        timeout: 60_000,
      });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // safeTransferFrom(sender, receiver, badge, 2), through the Light Account.
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(transferCall(badgeId, sender.address, receiver.address, BigInt(2))).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const moved = badgeMovementsIn(receipt);
      expect(moved).toHaveLength(1);
      expect(isAddressEqual(moved[0].from, sender.address)).toBe(true);
      expect(isAddressEqual(moved[0].to, receiver.address)).toBe(true);
      expect(moved[0].amount).toBe(BigInt(2));
      expect(await chain.badgeBalance(sender.address, badgeId)).toBe(BigInt(1));
      expect(await chain.badgeBalance(receiver.address, badgeId)).toBe(BigInt(2));
      expect(await chain.badgeTotalSupply(badgeId)).toBe(BigInt(3));

      // Both are listed, with their new amounts, without a reload.
      await expect(pages.badge.holders.section).toContainText("Holders (2)");
      await expect(pages.badge.holderAmountChip(senderCard)).toHaveText("1 / 3");
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(receiver.address))).toHaveText("2 / 3");
      await expect(actions.transferSubmit).toBeDisabled();

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge transferred successfully" });
    },
  );

  test(
    "H17: the amount refuses 0, a decimal and more than the holder has, in Burn and in Transfer",
    { tag: ["@edge"] },
    async ({ persona, actor, pages, page, wallet, chain, s3, subgraph, nextAccount }) => {
      const word = nextAccount().address.slice(2, 10).toLowerCase();
      const [me, sender, receiver] = await Promise.all([
        persona("fundedMember"),
        actor("member", { name: `Sender ${word}` }),
        actor("member", { name: `Receiver ${word}` }),
      ]);
      const badgeId = await badgeWithCopies({ chain, s3, subgraph }, me, sender.address, BigInt(3), word);
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badgeId);
      await pages.shell.connect();

      const refused = [
        ["0", "Amount must be at least 1"],
        ["1.5", "Enter a whole number"],
        ["4", "The holder has only 3"],
        ["", "Enter a whole number"],
      ] as const;

      // Burn.
      await actions.openBurnTab();
      await actions.pickBurnHolder(`Sender ${word}`);
      await actions.burnConfirmCheckbox.check();
      await expect(actions.burnSubmit).toBeEnabled();
      wallet.clearRequests();
      for (const [typed, reason] of refused) {
        await actions.amountInput.fill(typed);
        await expect(actions.amountInput, `"${typed}"`).toHaveAccessibleDescription(reason);
        await expect(actions.amountInput).toHaveAttribute("aria-invalid", "true");
        await expect(actions.burnSubmit, `"${typed}"`).toBeDisabled();
      }
      // All of them is allowed.
      await actions.amountInput.fill("3");
      await expect(actions.amountInput).toHaveAccessibleDescription("Holds 3");
      await expect(actions.burnSubmit).toBeEnabled();

      // Transfer.
      await actions.openTransferTab();
      await actions.pickTransferFrom(word, `Sender ${word}`);
      await actions.pickTransferTo(word, `Receiver ${word}`);
      await expect(actions.transferSubmit).toBeEnabled();
      for (const [typed, reason] of refused) {
        await actions.amountInput.fill(typed);
        await expect(actions.amountInput, `"${typed}"`).toHaveAccessibleDescription(reason);
        await expect(actions.transferSubmit, `"${typed}"`).toBeDisabled();
      }
      await actions.amountInput.fill("3");
      await expect(actions.transferSubmit).toBeEnabled();

      // Nothing was asked of the wallet, and nothing moved.
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await chain.badgeBalance(sender.address, badgeId)).toBe(BigInt(3));
      expect(await chain.badgeBalance(receiver.address, badgeId)).toBe(BigInt(0));
    },
  );

  test(
    "H18: a holder of one copy is offered no amount and loses exactly 1; a profile badge never offers one",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, chain, s3, subgraph, nextAccount }) => {
      const word = nextAccount().address.slice(2, 10).toLowerCase();
      const [me, single, several] = await Promise.all([
        persona("fundedMember"),
        actor("member", { name: `Single ${word}` }),
        actor("member", { name: `Several ${word}` }),
      ]);
      const badgeId = await badgeWithCopies({ chain, s3, subgraph }, me, single.address, BigInt(1), word);
      await chain.writeBadgesAs(me.address, "mint", [several.address, badgeId, BigInt(3), "0x"]);
      await subgraph.sync();
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badgeId);
      await pages.shell.connect();
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(single.address))).toHaveText("1 / 4");

      // One copy: no Amount, and the burn takes 1.
      await actions.openBurnTab();
      let read = actions.balanceRead(single.address);
      await actions.pickBurnHolder(`Single ${word}`);
      await read;
      await actions.burnConfirmCheckbox.check();
      await expect(actions.burnSubmit).toBeEnabled();
      await expect(pages.badge.gasEstimate).toBeVisible();
      await expect(actions.amountInput).toHaveCount(0);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await actions.burnSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge burned successfully", { timeout: 60_000 });
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(burnCall(badgeId, single.address, BigInt(1))).toLowerCase(),
      );
      expect(badgeMovementsIn(receipt).map((movement) => movement.amount)).toEqual([BigInt(1)]);
      expect(await chain.badgeBalance(single.address, badgeId)).toBe(BigInt(0));
      expect(await chain.badgeBalance(several.address, badgeId)).toBe(BigInt(3));
      await expect(pages.badge.holders.row(single.address)).toHaveCount(0);
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(several.address))).toHaveText("3 / 3");

      // A profile badge is one of one by contract; the app caps it at 1
      // without asking the chain. The real profile badges have no burner or
      // transferer, so the tabs are only reached by telling the page (the
      // subgraph) that this badge is a member's profile: its holder has 3
      // copies on chain and is still offered no amount.
      await subgraph.overlay(badgeEntity(badgeId, { isProfile: true, profileUser: several.address.toLowerCase() }));
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(several.address))).toHaveText("3 / 3");
      await actions.openBurnTab();
      read = actions.balanceRead(several.address);
      await actions.pickBurnHolder(`Several ${word}`);
      await read;
      await actions.burnConfirmCheckbox.check();
      await expect(actions.burnSubmit).toBeEnabled();
      await expect(pages.badge.gasEstimate).toBeVisible();
      await expect(actions.amountInput).toHaveCount(0);

      await actions.openTransferTab();
      await actions.pickTransferFrom(word, `Several ${word}`);
      await actions.setTransferTo(me.address);
      await expect(actions.transferSubmit).toBeEnabled();
      await expect(pages.badge.gasEstimate).toBeVisible();
      await expect(actions.amountInput).toHaveCount(0);

      // The transfer that is sent moves 1.
      const before = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await actions.transferSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge transferred successfully", {
        timeout: 60_000,
      });
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore: before });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(transferCall(badgeId, several.address, me.address, BigInt(1))).toLowerCase(),
      );
      expect(await chain.badgeBalance(several.address, badgeId)).toBe(BigInt(2));
      expect(await chain.badgeBalance(me.address, badgeId)).toBe(BigInt(1));
    },
  );
});
