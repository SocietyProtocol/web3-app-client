import {
  encodeFunctionData,
  formatUnits,
  isAddressEqual,
  parseEventLogs,
  zeroAddress,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { ChainLinkFeedABI } from "../../../src/abis/ChainlinkFeed";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { contracts } from "../../../src/consts/contracts";
import { encodeExecute } from "../../../src/lib/smart-account";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import type { Chain } from "../../support/chain/chain";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectOwnerSentDirectly,
  expectedCost,
  shownEth,
} from "../../support/write-route";

/**
 * Who sends a mint, and who pays for it.
 *
 * Minting is never sponsored. Three routes are left, and the page picks one
 * by simulating the call as the member's Light Account and as the wallet:
 *
 *   owner pays through the account  the Light Account may mint: the wallet
 *                                   sends one transaction to its execute
 *   owner                           only the wallet may mint (a right it
 *                                   holds itself): the wallet calls the
 *                                   badges contract directly
 *   blocked                         the wallet cannot pay the fee: nothing
 *                                   is sent, and the page says what the
 *                                   WALLET needs
 *
 * The Light Account holds no ETH in any of them and is never asked to.
 */

const EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

/** mintToMultiple([recipient], badgeId, 1, "0x"): the call the Mint tab makes. */
function mintCall(badgeId: bigint, recipient: Address): Hex {
  return encodeFunctionData({
    abi: SocietyProtocolBadgesABI,
    functionName: "mintToMultiple",
    args: [[recipient], badgeId, BigInt(1), "0x"],
  });
}

/** A fee in wei as the gas label's tooltip states it: in USD at the chain's ETH price feed, eight decimals. */
async function inUsd(chain: Chain, wei: bigint): Promise<string> {
  const price = await chain.public.readContract({
    address: contracts.chainlinkFeed.sepolia,
    abi: ChainLinkFeedABI,
    functionName: "latestAnswer",
  });
  return `$${formatUnits((wei * price) / BigInt(10) ** BigInt(18), 8)}`;
}

/** The one mint in a receipt: who the badges contract saw as the minter, and to whom. */
function mintIn(receipt: TransactionReceipt) {
  const mints = parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    eventName: "TransferSingle",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
  });
  expect(mints).toHaveLength(1);
  expect(mints[0].args.from).toBe(zeroAddress);
  expect(mints[0].args.value).toBe(BigInt(1));
  return { minter: mints[0].args.operator, recipient: mints[0].args.to, badgeId: mints[0].args.id };
}

test.describe("badge actions: who sends a mint and who pays", () => {
  test(
    "H1: minting to a new recipient is paid by the wallet through the Society account, and the new holder appears",
    { tag: ["@smoke", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, network, seenText }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member", { name: "New Holder" })]);
      const badge = me.badge!;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(await chain.balance(me.address), "the Light Account holds no ETH").toBe(BigInt(0));
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(0));

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      await pages.badge.openMintTab();

      // O9: while the page works out who can send the mint and what it
      // costs, the button says so and cannot be clicked.
      const pricing = network.holdRpc({ method: "eth_estimateGas" });
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toHaveText("Simulating...");
      await expect(pages.badge.mintSubmit).toBeDisabled();
      await expect(pages.badge.gasEstimate).toHaveCount(0);
      expect(pricing.hits()).toBeGreaterThan(0);
      pricing.release();

      // O9: then it names the fee the WALLET will pay, in USD: the price of
      // the transaction from the wallet to its Light Account.
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(pages.badge.mintExistingHolderWarning).toHaveCount(0);
      await expect(pages.badge.simulationError).toHaveCount(0);
      const cost = await expectedCost(chain, {
        from: me.ownerAddress,
        to: me.address,
        data: encodeExecute({ to: BADGES_ADDRESS, value: BigInt(0), data: mintCall(badge.id, recipient.address) }),
      });
      await expect(pages.badge.gasEstimate).toHaveText(/^(< \$0\.01|\$\d[\d,]*(\.\d+)?)\s*$/);
      await expect(pages.badge.gasEstimate.getByLabel(await inUsd(chain, cost), { exact: true })).toBeVisible();

      // O8: the "submitted" toast links to the wallet's transaction. The
      // page's read of the receipt is held so that the toast stays.
      const receiptRead = network.holdRpc({ method: "eth_getTransactionReceipt" });
      wallet.clearRequests();
      aa.clear();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("submitted")).toHaveText("Transaction submitted", { timeout: 60_000 });
      const [sent] = wallet.sendTransactionRequests();
      await expect(pages.shell.explorerLink("submitted")).toHaveAttribute("href", `${EXPLORER_TX}${sent.hash}`);
      receiptRead.release();

      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });
      await expect(pages.shell.explorerLink("success")).toHaveAttribute("href", `${EXPLORER_TX}${sent.hash}`);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction and no signature: from the wallet to its Light
      // Account, which the badges contract saw as the minter. The wallet
      // paid, within what the label said; nothing went through the bundler.
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const mint = mintIn(receipt);
      expect(isAddressEqual(mint.minter, me.address), "minted by the Light Account").toBe(true);
      expect(isAddressEqual(mint.recipient, recipient.address)).toBe(true);
      expect(mint.badgeId).toBe(badge.id);
      expect(receipt.gasUsed * receipt.effectiveGasPrice).toBeLessThanOrEqual(cost);
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(2));

      // The new holder is on the page right away. Each of the two holders
      // has one of the two units, as the page shows once it is loaded again
      // (without the reload: see the next test).
      await expect(pages.badge.holders.section).toContainText("Holders (2)");
      const card = pages.badge.holders.row(recipient.address);
      await expect(card).toContainText("New Holder");
      await page.reload();
      await expect(pages.badge.holders.section).toContainText("Holders (2)");
      await expect(pages.badge.holderAmountChip(card)).toHaveText("1 / 2");
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(me.holder!.address))).toHaveText("1 / 2");

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge minted successfully" });
    },
  );

  test(
    "H1: after minting to a new recipient the holders' amounts are up to date without a reload",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, wallet, chain }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      const firstHolderChip = pages.badge.holderAmountChip(pages.badge.holders.row(me.holder!.address));
      await expect(firstHolderChip).toHaveText("1 / 1");
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(1));
      expect(await chain.badgeTotalSupply(badge.id)).toBe(BigInt(2));

      // The new holder's card appears, and its own count is right.
      const newHolderChip = pages.badge.holderAmountChip(pages.badge.holders.row(recipient.address));
      await expect(newHolderChip).toHaveAttribute("data-count", "1");

      // APP BUG, expected to fail until it is fixed (the one of H2 in
      // mint.spec.ts, seen from a new recipient): both cards read "1 / 1"
      // after "Badge minted successfully", although the supply is 2 now.
      // The new holder's balance is a new chain read, so it is right; the
      // total supply is not read again, because useMintBadgeMutation
      // invalidates the subgraph queries only and the totalSupply read of
      // useBadgeQuantities keeps its key. A reload shows "1 / 2" (previous
      // test). Everything above this line must pass; only the assertions
      // below are expected to fail.
      test.fail(true, "the total supply on the holder cards is not refetched after a mint (useBadgeQuantities)");
      // Short on purpose: a known failure should not cost a long wait. Five
      // seconds is still many times what a fixed app needs here (one chain read after the success toast),
      // so a fix shows up as an unexpected pass. Remove this timeout
      // together with test.fail.
      await expect(newHolderChip).toHaveText("1 / 2", { timeout: 5_000 });
      await expect(firstHolderChip).toHaveText("1 / 2", { timeout: 5_000 });
    },
  );

  test(
    "H10: a minter whose wallet has no ETH is told what the wallet needs, nothing is sent, and the mint is open again once the wallet is funded",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, seenText }) => {
      const [me, recipient] = await Promise.all([persona("badgeMinter"), actor("member")]);
      const badge = me.badge!;
      // The Light Account has never held ETH; now the wallet holds none either.
      await chain.setBalance(me.ownerAddress, 0);
      expect(await chain.balance(me.address)).toBe(BigInt(0));

      await pages.badge.open(badge.id);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      wallet.clearRequests();
      await pages.badge.setMintRecipient(recipient.address);

      // The message is about the wallet: it names the wallet's address and
      // the fee of the transaction the wallet would send.
      const cost = await expectedCost(chain, {
        from: me.ownerAddress,
        to: me.address,
        data: encodeExecute({ to: BADGES_ADDRESS, value: BigInt(0), data: mintCall(badge.id, recipient.address) }),
      });
      await expect(pages.badge.simulationError).toHaveText(
        `Your wallet ${me.ownerAddress} needs about ${shownEth(cost)} ETH to pay the network fee for this action`,
      );
      await expect(pages.badge.simulationError).not.toContainText(me.address);
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeDisabled();
      await expect(pages.badge.gasEstimate).toHaveCount(0);

      // Nothing was asked of the wallet and nothing was sent anywhere.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(0));
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "to pay the network fee for this action" });

      // ETH in the wallet, not in the Society account, is what opens it.
      await chain.setBalance(me.ownerAddress, 1);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      await page.reload();
      // The reload keeps the wallet connected; the tabs come back with it.
      await expect(pages.shell.accountButton).toBeVisible();
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(isAddressEqual(mintIn(receipt).minter, me.address)).toBe(true);
      expect(await chain.badgeBalance(recipient.address, badge.id)).toBe(BigInt(1));
    },
  );

  test(
    "H11: a mint only the wallet may make is sent by the wallet itself, with its fee shown",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      // A member whose right to mint sits on the wallet, not on the Society
      // account (as it does for a member from before Society accounts): the
      // badge may be minted by holders of a "minter" badge, and the only
      // holder of that one is the member's wallet.
      const [me, recipient] = await Promise.all([persona("fundedMember"), actor("member")]);
      const { uri } = await s3.putJson({ name: "E2E routing badge", description: "Made for one test.", imageUrl: null });
      const minterBadge = await chain.createBadge({
        creator: me.address,
        name: `E2E Minters ${me.address.slice(2, 8)}`,
        uri,
        minters: [me.profile!.badgeId],
      });
      await chain.writeBadgesAs(me.address, "mint", [me.ownerAddress, minterBadge, BigInt(1), "0x"]);
      const badgeId = await chain.createBadge({
        creator: me.address,
        name: `E2E Wallet-minted ${me.address.slice(2, 8)}`,
        uri,
        minters: [minterBadge],
      });
      await subgraph.sync();
      expect(await chain.badgeBalance(me.ownerAddress, minterBadge)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.address, minterBadge)).toBe(BigInt(0));
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      // The page offers the Mint tab: it looks at both of the member's addresses.
      await pages.badge.open(badgeId);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);

      // O9: the fee shown is that of the wallet's own call to the badges contract.
      const data = mintCall(badgeId, recipient.address);
      const cost = await expectedCost(chain, { from: me.ownerAddress, to: BADGES_ADDRESS, data });
      await expect(pages.badge.gasEstimate.getByLabel(await inUsd(chain, cost), { exact: true })).toBeVisible();

      wallet.clearRequests();
      aa.clear();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge minted successfully", { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction, from the wallet straight to the badges contract
      // with exactly the mint as its data: not through the Light Account,
      // which could not have made this call.
      const receipt = await expectOwnerSentDirectly(
        { wallet, chain },
        { persona: me, to: BADGES_ADDRESS, ownerBalanceBefore },
      );
      const [asked] = wallet.sendTransactionRequests()[0].params as [{ data: Hex }];
      expect(asked.data.toLowerCase()).toBe(data.toLowerCase());
      const mint = mintIn(receipt);
      expect(isAddressEqual(mint.minter, me.ownerAddress), "minted by the wallet").toBe(true);
      expect(isAddressEqual(mint.recipient, recipient.address)).toBe(true);
      expect(aa.calls).toHaveLength(0);
      expect(await seenText.matching(/Step \d of 2|Free gas is unavailable/)).toEqual([]);
      expect(await chain.badgeBalance(recipient.address, badgeId)).toBe(BigInt(1));

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge minted successfully" });
    },
  );
});
