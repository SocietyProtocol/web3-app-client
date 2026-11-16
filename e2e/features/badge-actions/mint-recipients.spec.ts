import { getAddress, isAddressEqual, zeroAddress, type Address } from "viem";
import legacyAccountMap from "../../../src/consts/legacy-account-map.json";
import { CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { BadgeActionsPanel } from "../../support/pages/badge-actions";
import { expectOwnerPaidThroughAccount } from "../../support/write-route";
import { badgeMovementsIn, shortened } from "./steps";

/**
 * Who a badge is minted to. A member is known to the contracts by their
 * Society address (a Light Account), not by their wallet, so the Mint tab
 * helps with an address that looks like a wallet:
 *
 *   a wallet from before Society accounts (the legacy map)
 *                         replaced by its Society address, with a notice
 *   any other address without contract code
 *                         a hint that names the Society address it would
 *                         have; a Replace button only when the app has
 *                         evidence that it is a wallet
 *   text that is not an address
 *                         refused with an error
 */

/** A wallet of the legacy map of this chain and the Society address it moved to. */
function legacyPair(): { wallet: Address; society: Address } {
  const forChain = (legacyAccountMap as Record<string, Record<string, string>>)[String(CHAIN_ID)] ?? {};
  const [wallet, society] = Object.entries(forChain)[0] ?? [];
  if (!wallet || !society) throw new Error(`The legacy map has no entry for chain ${CHAIN_ID}`);
  return { wallet: getAddress(wallet), society: getAddress(society) };
}

/**
 * The text, whatever the case of its letters: the app shows an address as
 * the field hands it over, which is as typed or in lower case.
 */
function ignoringCase(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

test.describe("badge actions: mint recipients", () => {
  test(
    "H5: a legacy wallet typed as recipient is replaced by its Society address, which receives the badge",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, chain }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const legacy = legacyPair();
      const [societyBefore, walletBefore] = await Promise.all([
        chain.badgeBalance(legacy.society, badge.id),
        chain.badgeBalance(legacy.wallet, badge.id),
      ]);
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      // Typed in lower case, as it is in most places a user would copy it from.
      await pages.badge.setMintRecipient(legacy.wallet.toLowerCase());

      await expect(actions.mappedNotice).toHaveText(
        `${shortened(legacy.wallet)} is a migrated wallet. Using its Society address ${shortened(legacy.society)} instead.`,
      );
      await expect(actions.mappedNotice.getByTitle(legacy.society, { exact: true })).toBeVisible();
      // It is the Society address that is in the field now: no "may be a wallet" hint about it.
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(actions.walletHints).toHaveCount(0);
      await expect(pages.badge.simulationError).toHaveCount(0);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });

      // The badge went to the Society address, not to the wallet that was typed.
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const minted = badgeMovementsIn(receipt);
      expect(minted).toHaveLength(1);
      expect(minted[0].from).toBe(zeroAddress);
      expect(isAddressEqual(minted[0].to, legacy.society), `minted to ${minted[0].to}`).toBe(true);
      expect(isAddressEqual(minted[0].operator, me.address)).toBe(true);
      expect(await chain.badgeBalance(legacy.society, badge.id)).toBe(societyBefore + BigInt(1));
      expect(await chain.badgeBalance(legacy.wallet, badge.id)).toBe(walletBefore);
      await expect(pages.badge.holders.row(legacy.society)).toBeVisible();
      await expect(pages.badge.holders.row(legacy.wallet)).toHaveCount(0);
    },
  );

  test(
    "H6: a member's wallet typed as recipient gets a hint with Replace, and Replace puts in their Society address",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, chain }) => {
      const [me, member] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      // The member's wallet, not their Society address: an easy mistake.
      await pages.badge.setMintRecipient(member.ownerAddress);

      const hint = actions.walletHints;
      await expect(hint).toHaveCount(1);
      await expect(hint).toContainText(
        ignoringCase(`If ${shortened(member.ownerAddress)} is a wallet, the member's Society address is`),
      );
      await expect(hint).toContainText("Ignore this if it is already a Society address.");
      await expect(hint.getByTitle(member.address, { exact: true })).toHaveText(member.address);
      // The app knows this one is a wallet (its Society address has a profile): it offers to swap.
      await expect(actions.replaceButton(hint)).toBeVisible();
      // The hint is advice only: the mint to the wallet is not held back.
      await expect(pages.badge.mintSubmit).toBeEnabled();

      // The Society address is a contract: nothing to hint about any more.
      // Only once the app has read its code: until then there is no hint
      // for any address.
      const decided = actions.codeRead(member.address);
      await actions.replaceButton(hint).click();
      await decided;
      await expect(actions.walletHints).toHaveCount(0);
      await expect(pages.badge.mintSubmit).toBeEnabled();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });

      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const minted = badgeMovementsIn(receipt);
      expect(minted).toHaveLength(1);
      expect(isAddressEqual(minted[0].to, member.address), `minted to ${minted[0].to}`).toBe(true);
      expect(await chain.badgeBalance(member.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(member.ownerAddress, badge.id)).toBe(BigInt(0));
      await expect(pages.badge.holders.row(member.address)).toContainText(member.profile!.name);
    },
  );

  test(
    "H6: an address the app knows nothing about gets the hint without Replace, and a Society address gets none",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet, chain, nextAccount }) => {
      const [me, member] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const stranger = nextAccount().address;
      const actions = new BadgeActionsPanel(page);

      await pages.badge.open(me.badge!.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();

      // Never seen: no code, no transaction, no profile on the Society
      // address it would have. It may be a Society address that is not set
      // up yet, so the app only says what it would be as a wallet.
      await pages.badge.setMintRecipient(stranger);
      const hint = actions.walletHints;
      await expect(hint).toHaveCount(1);
      await expect(hint).toContainText(ignoringCase(`If ${shortened(stranger)} is a wallet`));
      const wouldBe = chain.societyAddress(stranger);
      await expect(hint.getByTitle(wouldBe, { exact: true })).toHaveText(wouldBe);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(actions.replaceButton(hint)).toHaveCount(0);

      // A member's Society address is a contract: no hint. (From a fresh
      // form: the field is not relied on to take a second address over a first.)
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await pages.badge.openMintTab();
      const decided = actions.codeRead(member.address);
      await pages.badge.setMintRecipient(member.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      // Only once the app has read the address's code: until then there is
      // no hint for any address.
      await decided;
      await expect(actions.walletHints).toHaveCount(0);
      await expect(actions.mappedNotice).toHaveCount(0);

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "H7: text that is not an address is refused with an error and is not taken as recipient",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet, aa, nextAccount }) => {
      const me = await persona("badgeMinter");
      const actions = new BadgeActionsPanel(page);
      const errorToast = (text: string) => pages.shell.toast("error").filter({ hasText: text });

      await pages.badge.open(me.badge!.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      wallet.clearRequests();

      // Single mode: a word, and something that only starts like an address.
      await pages.badge.setMintRecipient("not-an-address");
      await expect(errorToast("Invalid address (not-an-address)")).toBeVisible();
      await pages.badge.setMintRecipient("0x1234");
      await expect(errorToast("Invalid address (0x1234)")).toBeVisible();
      await expect(pages.badge.mintSubmit).toBeDisabled();
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(actions.walletHints).toHaveCount(0);
      await expect(pages.badge.mintExistingHolderWarning).toHaveCount(0);

      // Batch mode: the same refusal, and no chip.
      await actions.mintMode("Batch").click();
      await actions.addBatchRecipient("0xnot-hex-at-all");
      await expect(errorToast("Invalid address (0xnot-hex-at-all)")).toBeVisible();
      await expect(actions.recipientChipRemoveButtons).toHaveCount(0);
      await expect(pages.badge.mintSubmit).toBeDisabled();

      // The field still works: a real address is taken.
      await actions.addBatchRecipient(nextAccount().address);
      await expect(actions.recipientChipRemoveButtons).toHaveCount(1);
      await expect(pages.badge.mintSubmit).toBeEnabled();

      // Nothing was asked of the wallet or sent anywhere.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
    },
  );
});
