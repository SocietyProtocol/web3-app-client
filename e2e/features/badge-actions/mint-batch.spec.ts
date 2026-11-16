import { isAddressEqual, zeroAddress, type Address } from "viem";
import { expect, test } from "../../fixtures";
import { BadgeActionsPanel } from "../../support/pages/badge-actions";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  lastTransactionAsked,
} from "../../support/write-route";
import { badgeMovementsIn, mintCall, throughAccount } from "./steps";

/**
 * The Mint tab in Batch mode: one unit of the badge to each of several
 * recipients, typed one by one or read from a file of comma-separated
 * addresses. It is one call (mintToMultiple), so one transaction, sent by
 * the owner wallet through the member's Light Account like a single mint.
 */

const ALREADY_HOLDS = "already holds this badge. They will receive another one.";

test.describe("badge actions: batch mint", () => {
  test(
    "H3: several typed addresses are minted to in one transaction, one unit each",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, seenText }) => {
      const [me, first, second] = await Promise.all([persona("badgeMinter"), actor("member"), actor("member")]);
      const badge = me.badge!;
      const holder = me.holder!;
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await actions.mintMode("Batch").click();
      await expect(actions.mintMode("Batch")).toHaveAttribute("aria-selected", "true");
      await expect(page.getByText("Recipient Addresses", { exact: true })).toBeVisible();
      await expect(actions.dropArea).toBeVisible();
      await expect(pages.badge.mintSubmit).toBeDisabled();

      // Each address becomes a chip; the file area goes away with the first.
      await actions.addBatchRecipient(first.address);
      await expect(actions.recipientChipRemoveButtons).toHaveCount(1);
      await expect(actions.dropArea).toHaveCount(0);
      await actions.addBatchRecipient(second.address);
      await expect(actions.recipientChipRemoveButtons).toHaveCount(2);
      // The same address again, written differently, is not a second recipient.
      await actions.addBatchRecipient(first.address.toLowerCase());
      await expect(actions.recipientChipRemoveButtons).toHaveCount(2);

      // Someone who already holds the badge may be among them: a notice, no obstacle.
      await actions.addBatchRecipient(holder.address);
      await expect(actions.recipientChipRemoveButtons).toHaveCount(3);
      await expect(pages.badge.mintExistingHolderWarning).toHaveText(
        new RegExp(`^${holder.address} ${ALREADY_HOLDS.replace(/\./g, "\\.")}$`, "i"),
      );

      // A chip can be taken out again, and the address added back.
      await actions.area.getByRole("button", { name: new RegExp(`^Remove ${second.address}$`, "i") }).click();
      await expect(actions.recipientChipRemoveButtons).toHaveCount(2);
      await actions.addBatchRecipient(second.address);
      await expect(actions.recipientChipRemoveButtons).toHaveCount(3);
      const recipients: Address[] = [first.address, holder.address, second.address];

      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.simulationError).toHaveCount(0);
      await expect(pages.badge.gasEstimate).toBeVisible();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction of the owner wallet through its Light Account,
      // carrying one mintToMultiple for the three recipients in the order
      // they are in the field. No signature, nothing through the bundler.
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(mintCall(badge.id, recipients)).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const minted = badgeMovementsIn(receipt);
      expect(minted).toHaveLength(3);
      for (const [index, mint] of minted.entries()) {
        expect(isAddressEqual(mint.operator, me.address), "minted by the Light Account").toBe(true);
        expect(mint.from).toBe(zeroAddress);
        expect(isAddressEqual(mint.to, recipients[index])).toBe(true);
        expect(mint.badgeId).toBe(badge.id);
        expect(mint.amount).toBe(BigInt(1));
      }

      // On chain: one more unit each, four in all.
      expect(await chain.badgeBalance(first.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(second.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(2));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(4));

      // The field is empty again, and the two new holders are on the page.
      await expect(actions.recipientChipRemoveButtons).toHaveCount(0);
      await expect(actions.dropArea).toBeVisible();
      await expect(pages.badge.holders.section).toContainText("Holders (3)");
      await expect(pages.badge.holders.row(first.address)).toContainText(first.profile!.name);
      await expect(pages.badge.holders.row(second.address)).toContainText(second.profile!.name);
      // The amounts, as the page shows them once it is loaded again
      // (without the reload they are stale: the app bug of H2).
      await page.reload();
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(first.address))).toHaveText("1 / 4");
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(second.address))).toHaveText("1 / 4");
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(holder.address))).toHaveText("2 / 4");

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge minted successfully" });
    },
  );

  test(
    "H4: a file of addresses is read into valid and invalid entries, can be cleared, and its valid ones are minted to",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, nextAccount, seenText }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const [first, second] = [nextAccount().address, nextAccount().address];
      // Two addresses, one of them twice, and two entries that are not addresses.
      const file = { name: "recipients.csv", content: `${first}, ${second},not-an-address, 0x1234,${first}\n` };
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await actions.mintMode("Batch").click();
      await expect(actions.dropArea).toContainText("Format: address1, address2, address3, ...");
      await expect(actions.dropArea).toContainText("CSV up to 2MB");

      await actions.uploadRecipients(file);
      await expect(actions.validCount).toHaveText("Valid: 2");
      await expect(actions.invalidCount).toHaveText("Invalid: 2");
      await expect(actions.invalidEntry("not-an-address")).toBeVisible();
      await expect(actions.invalidEntry("0x1234")).toBeVisible();
      await expect(actions.recipientChipRemoveButtons).toHaveCount(2);
      await expect(actions.dropArea).toHaveCount(0);
      await expect(pages.badge.mintSubmit).toBeEnabled();

      // Clear All: back to the empty field and the file area.
      await actions.clearAllButton.click();
      await expect(actions.recipientChipRemoveButtons).toHaveCount(0);
      await expect(actions.validCount).toHaveCount(0);
      await expect(actions.invalidCount).toHaveCount(0);
      await expect(actions.dropArea).toBeVisible();
      await expect(pages.badge.mintSubmit).toBeDisabled();
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // The same file again, and this time it is minted.
      await actions.uploadRecipients(file);
      await expect(actions.validCount).toHaveText("Valid: 2");
      await expect(pages.badge.mintSubmit).toBeEnabled();
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });

      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(lastTransactionAsked(wallet).data.toLowerCase()).toBe(
        throughAccount(mintCall(badge.id, [first, second])).toLowerCase(),
      );
      expect(aa.calls).toHaveLength(0);
      const minted = badgeMovementsIn(receipt);
      expect(minted.map((mint) => mint.to.toLowerCase())).toEqual([first.toLowerCase(), second.toLowerCase()]);
      expect(minted.every((mint) => isAddressEqual(mint.operator, me.address) && mint.from === zeroAddress)).toBe(true);
      expect(await chain.badgeBalance(first, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(second, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(3));
      await expect(pages.badge.holders.section).toContainText("Holders (3)");

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge minted successfully" });
    },
  );

  test(
    "H4: a file without a single address, and a file that is not text, are refused with a reason",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet }) => {
      const me = await persona("badgeMinter");
      const actions = new BadgeActionsPanel(page);
      await pages.badge.open(me.badge!.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await actions.mintMode("Batch").click();

      // Not text at all: refused before it is read.
      await actions.uploadRecipients({ name: "picture.png", content: "not really a picture", mimeType: "image/png" });
      await expect(pages.shell.toast("error")).toHaveText("Invalid file type");
      await expect(actions.validCount).toHaveCount(0);
      await expect(actions.dropArea).toBeVisible();

      // Text, but no address in it: the file area says what it expects.
      await actions.uploadRecipients({ name: "names.csv", content: "alice, bob" });
      await expect(actions.dropArea).toContainText("File must contain valid addresses, separated by commas");
      await expect(actions.validCount).toHaveText("Valid: 0");
      await expect(actions.invalidCount).toHaveText("Invalid: 2");
      await expect(actions.invalidEntry("alice")).toBeVisible();
      await expect(actions.invalidEntry("bob")).toBeVisible();
      await expect(actions.recipientChipRemoveButtons).toHaveCount(0);
      await expect(pages.badge.mintSubmit).toBeDisabled();

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "H4: a file of more than 2 MB is refused: nothing can be minted from it, and the page says why",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet, chain, nextAccount }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const [first, second] = [nextAccount().address, nextAccount().address];
      // Two good addresses, then blanks up to just over the limit.
      const content = Buffer.concat([
        Buffer.from(`${first}, ${second},`, "utf8"),
        Buffer.alloc(2 * 1024 * 1024, " "),
      ]);
      const actions = new BadgeActionsPanel(page);
      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await actions.mintMode("Batch").click();
      wallet.clearRequests();

      await actions.uploadRecipients({ name: "too-big.csv", content });
      // The file is read (its two addresses are counted), but it cannot be minted from.
      await expect(actions.validCount).toHaveText("Valid: 2");
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeDisabled();
      await expect(pages.badge.gasEstimate).toHaveCount(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await chain.badgeBalance(first, badge.id)).toBe(BigInt(0));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(1));

      // APP BUG, expected to fail until it is fixed: the page does not say
      // why. The size rule ("File must be less than 2MB", validation.ts) is
      // an error of the form's `file` field, and MintTab shows only the
      // error of `fileContent`, inside the file area, which is taken off
      // the page as soon as the file has one valid address. The user sees
      // "Valid: 2" next to a Mint button that stays disabled. Everything
      // above this line must pass; only the assertion below is expected to
      // fail.
      test.fail(true, "a file over 2 MB disables Mint without showing the reason (MintTab shows no error of the file field)");
      // Short on purpose: a fixed app has the message on screen already.
      // Remove this timeout together with test.fail.
      await expect(actions.area.getByText("File must be less than 2MB")).toBeVisible({ timeout: 2_000 });
    },
  );
});
