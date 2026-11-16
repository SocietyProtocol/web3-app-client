import { isAddressEqual, parseEventLogs, zeroAddress, type Address } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test, type Persona } from "../../fixtures";
import type { Chain } from "../../support/chain/chain";
import type { TestWallet } from "../../support/wallet/test-wallet";
import { expectOwnerPaidThroughAccount } from "../../support/write-route";

/**
 * The Mint tab of /badges/<id>.
 *
 * Minting is not sponsored. The member's Light Account (the Society
 * address) is what the badges contract sees as the minter, and the owner
 * wallet pays: one ordinary transaction from the wallet to the Light
 * Account's execute. The Light Account holds no ETH and is never asked to.
 */

const ALREADY_HOLDS = "already holds this badge. They will receive another one.";

/**
 * The mint the page just made: one transaction of the owner wallet through
 * its Light Account, paid by the wallet, in which the badges contract saw
 * the Light Account mint one unit to `recipient`.
 */
async function expectMintPaidByOwnerThroughAccount(
  { wallet, chain }: { wallet: TestWallet; chain: Chain },
  input: { minter: Persona; badgeId: bigint; recipient: Address; ownerBalanceBefore: bigint },
) {
  const { minter, badgeId, recipient, ownerBalanceBefore } = input;
  const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: minter, ownerBalanceBefore });

  const mints = parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    eventName: "TransferSingle",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
  });
  expect(mints).toHaveLength(1);
  expect(isAddressEqual(mints[0].args.operator, minter.address), "minted by the Light Account").toBe(true);
  expect(mints[0].args.from).toBe(zeroAddress);
  expect(isAddressEqual(mints[0].args.to, recipient)).toBe(true);
  expect(mints[0].args.id).toBe(badgeId);
  expect(mints[0].args.value).toBe(BigInt(1));
}

test.describe("badge actions: mint", () => {
  test(
    "H2: the picker offers an existing holder, warns, and the mint gives them another unit",
    { tag: ["@smoke", "@owner-tx"] },
    async ({ persona, pages, page, wallet, chain }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const holder = me.holder!;
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(1));
      expect(await chain.balance(me.address), "the Light Account holds no ETH").toBe(BigInt(0));
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      const holderCard = pages.badge.holders.row(holder.address);
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("1 / 1");

      // The picker lists the holder (it used to leave holders out) and takes them.
      await pages.badge.openMintTab();
      await pages.badge.pickMintRecipient(holder.profile!.name);
      await expect(pages.badge.mintExistingHolderWarning).toHaveText(
        new RegExp(`^${holder.address} ${ALREADY_HOLDS.replace(/\./g, "\\.")}$`, "i"),
      );

      // Nothing stands in the way: no "would fail", no request for ETH.
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);
      await expect(page.getByText(/needs (about )?[\d.]* ?ETH/i)).toHaveCount(0);

      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.transactionToast("success")).toContainText("Badge minted successfully");
      await expect(pages.shell.transactionToast("error")).toHaveCount(0);

      await expectMintPaidByOwnerThroughAccount(
        { wallet, chain },
        { minter: me, badgeId: badge.id, recipient: holder.address, ownerBalanceBefore },
      );

      // On chain the holder has two units of a supply of two.
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(2));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(2));

      // And so does the page once it is loaded again: still one holder, now
      // with two of two. (Without the reload: see the next test.)
      await page.reload();
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      await expect(pages.badge.holderAmountChip(holderCard)).toHaveText("2 / 2");
    },
  );

  test(
    "H2: after minting to an existing holder their amount is up to date without a reload",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, chain }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const holder = me.holder!;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      const holderChip = pages.badge.holderAmountChip(pages.badge.holders.row(holder.address));
      await expect(holderChip).toHaveText("1 / 1");

      // This time the holder's address is typed in, not picked from the list.
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(holder.address);
      await expect(pages.badge.mintExistingHolderWarning).toHaveText(`${holder.address} ${ALREADY_HOLDS}`);
      await expect(pages.badge.mintSubmit).toBeEnabled();

      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expectMintPaidByOwnerThroughAccount(
        { wallet, chain },
        { minter: me, badgeId: badge.id, recipient: holder.address, ownerBalanceBefore },
      );
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(2));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(2));

      // The page shows the new amount without a reload. The amounts come
      // from the chain reads of useBadgeQuantities (balanceOf / totalSupply
      // through wagmi's useReadContracts), whose query keys do not change
      // when the holder list stays the same, so this holds only because the
      // mint invalidates the badge contract's chain reads (it once
      // invalidated the subgraph queries only, and the card kept "1 / 1").
      await expect(holderChip).toHaveText("2 / 2");
    },
  );
});
