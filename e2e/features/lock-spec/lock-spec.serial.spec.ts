import { isAddressEqual } from "viem";
import { expect, test } from "../../fixtures";
import {
  SECONDS_PER_YEAR,
  SPEC_TOKEN_ADDRESS,
  VIP_MANAGER_ADDRESS,
  currentLock,
  giveSpec,
  lockAs,
  lockCall,
  lockParameters,
  lockTransaction,
  locksIn,
  specBalance,
} from "../../support/builders/lock-spec";
import { tokenAllowance } from "../../support/builders/auction-tokens";
import { LockSpecPage } from "../../support/pages/lock-spec";
import { expectNeverAskedToFundSocietyAccount, expectOwnerApprovedThenSent } from "../../support/write-route";
import {
  balanceShown,
  compactSpecAmount,
  shortDate,
  shortened,
  specAmount,
  summaryRow,
  unlockMonth,
} from "./steps";

/**
 * /profile/lock-spec: locking SPEC for a VIP tier.
 *
 * SPEC and the lock belong to the owner WALLET, not to the Society account,
 * and the VIP manager is not an Outpost contract: approve and lock are
 * ordinary transactions of the wallet itself (the "owner" route). The tier
 * amounts and the shortest lock are read from the VIP manager on the fork,
 * so the tests compare the page with the chain, not with numbers written
 * here. The lock history comes from the subgraph, and the fake does not
 * follow the VIP manager: where a test needs a history row it builds it
 * from a transaction that happened (support/builders/lock-spec.ts).
 *
 * Serial: a lock changes what the VIP manager holds. Claiming after the
 * lock's end moves the chain's clock and is in a file of its own
 * (unlock-after-expiry.timetravel.spec.ts, the hermetic-timetravel project).
 */
const EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

test.describe("lock SPEC", () => {
  test(
    "N1: a visitor is asked to connect, and a wallet without a profile to set one up first",
    { tag: ["@core"] },
    async ({ page, persona, pages }) => {
      const lockSpec = new LockSpecPage(page);
      await persona("new");
      await lockSpec.open();

      // Logged out: the title and a prompt to connect, nothing to lock with.
      await expect(lockSpec.heading).toBeVisible();
      await expect(pages.shell.connectPrompt).toBeVisible();
      await expect(lockSpec.tab("Lock")).toHaveCount(0);
      await expect(lockSpec.submit).toHaveCount(0);

      // Connected, but this wallet's Society account has no profile.
      await pages.shell.connect();
      await expect(pages.onboarding.setupPrompt).toContainText("Welcome! Let's get started by setting up your account.");
      await expect(pages.shell.connectPrompt).toHaveCount(0);
      await expect(lockSpec.tab("Lock")).toHaveCount(0);
      await expect(lockSpec.submit).toHaveCount(0);

      // The prompt leads to the profile wizard.
      await pages.onboarding.startButton.click();
      await expect(page).toHaveURL(/\/profile\?setupOpen=true$/);
      await expect(pages.onboarding.form).toBeVisible();
    },
  );

  test(
    "N1: on the wrong network the page asks to switch, and the tabs are back after the switch",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet }) => {
      const lockSpec = new LockSpecPage(page);
      await persona("member");
      await lockSpec.open();
      await pages.shell.connect();
      await expect(lockSpec.tab("Lock")).toBeVisible();
      await expect(lockSpec.submit).toBeVisible();

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      await wallet.setChainId(1);
      await expect(pages.shell.wrongNetworkPrompt).toContainText("You are connected to the wrong network.");
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      await expect(lockSpec.tab("Lock")).toHaveCount(0);
      await expect(lockSpec.submit).toHaveCount(0);

      wallet.clearRequests();
      await pages.shell.switchNetworkButton.click();
      await expect(pages.shell.wrongNetworkPrompt).toHaveCount(0);
      await expect(lockSpec.tab("Lock")).toBeVisible();
      await expect(lockSpec.submit).toBeVisible();
      expect(wallet.requestsOf("wallet_switchEthereumChain").map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "N2: the Lock tab shows the wallet's SPEC, the tiers with their on-chain amounts, and a summary that follows the selection",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const lockSpec = new LockSpecPage(page);
      const me = await persona("fundedMember");
      const tiers = await lockParameters(chain);
      // Enough for any tier, with something left over.
      const balance = tiers.gold * BigInt(2);
      await giveSpec(chain, me.ownerAddress, balance);

      await lockSpec.open();
      await pages.shell.connect();
      wallet.clearRequests();
      await expect(lockSpec.tab("Lock")).toHaveAttribute("aria-selected", "true");

      // The balance is the wallet's, and the page says whose it is.
      await expect(lockSpec.balance).toHaveText(balanceShown(balance));
      await expect(lockSpec.walletLine).toHaveText(`held by your wallet ${shortened(me.ownerAddress)}`);
      expect(isAddressEqual(me.ownerAddress, me.address), "the wallet is not the Society account").toBe(false);

      // Each tier costs what the VIP manager says.
      await expect(lockSpec.tierCard("Bronze")).toContainText(specAmount(tiers.bronze));
      await expect(lockSpec.tierCard("Silver")).toContainText(specAmount(tiers.silver));
      await expect(lockSpec.tierCard("Gold")).toContainText(specAmount(tiers.gold));
      await expect(lockSpec.tierCard("Bronze")).toContainText("(Serious community chat)");

      // Silver for three years is selected to start with.
      await expect(lockSpec.tierCard("Silver")).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.tierCard("Bronze")).toHaveAttribute("aria-pressed", "false");
      await expect(lockSpec.tierCard("Gold")).toHaveAttribute("aria-pressed", "false");
      await expect(lockSpec.duration(3)).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.duration(1)).toHaveAttribute("aria-pressed", "false");
      await expect(lockSpec.summary).toContainText(summaryRow("Plan:", "Silver"));
      await expect(lockSpec.summary).toContainText(summaryRow("Amount:", compactSpecAmount(tiers.silver)));
      await expect(lockSpec.summary).toContainText(summaryRow("Lock duration:", "3 Years"));
      await expect(lockSpec.summary).toContainText(summaryRow("Unlock date:", unlockMonth(3)));
      // Nothing is approved yet, so the button starts with the approval.
      await expect(lockSpec.submit).toHaveText("Approve and Lock");
      await expect(lockSpec.submit).toBeEnabled();

      // Gold for one year.
      await lockSpec.tierCard("Gold").click();
      await lockSpec.duration(1).click();
      await expect(lockSpec.tierCard("Gold")).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.tierCard("Silver")).toHaveAttribute("aria-pressed", "false");
      await expect(lockSpec.duration(1)).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.duration(3)).toHaveAttribute("aria-pressed", "false");
      await expect(lockSpec.summary).toContainText(summaryRow("Plan:", "Gold"));
      await expect(lockSpec.summary).toContainText(summaryRow("Amount:", compactSpecAmount(tiers.gold)));
      await expect(lockSpec.summary).toContainText(summaryRow("Lock duration:", "1 Year"));
      await expect(lockSpec.summary).toContainText(summaryRow("Unlock date:", unlockMonth(1)));

      // Bronze for four years.
      await lockSpec.tierCard("Bronze").click();
      await lockSpec.duration(4).click();
      await expect(lockSpec.summary).toContainText(summaryRow("Plan:", "Bronze"));
      await expect(lockSpec.summary).toContainText(summaryRow("Amount:", compactSpecAmount(tiers.bronze)));
      await expect(lockSpec.summary).toContainText(summaryRow("Lock duration:", "4 Years"));
      await expect(lockSpec.summary).toContainText(summaryRow("Unlock date:", unlockMonth(4)));
      await expect(lockSpec.submit).toHaveText("Approve and Lock");

      // Looking and choosing asks nothing of the wallet.
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
    },
  );

  test(
    'N3: a tier the wallet cannot afford says "Insufficient Balance" and cannot be locked',
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const lockSpec = new LockSpecPage(page);
      const me = await persona("fundedMember");
      const tiers = await lockParameters(chain);
      expect(tiers.bronze < tiers.silver && tiers.silver < tiers.gold, "the tiers cost more from bronze to gold").toBe(
        true,
      );
      expect(await specBalance(chain, me.ownerAddress)).toBe(BigInt(0));

      // A wallet without SPEC cannot lock any tier. Its ETH does not help.
      await lockSpec.open();
      await pages.shell.connect();
      wallet.clearRequests();
      await expect(lockSpec.balance).toHaveText("0 SPEC");
      for (const tier of ["Silver", "Bronze", "Gold"] as const) {
        await lockSpec.tierCard(tier).click();
        await expect(lockSpec.tierCard(tier)).toHaveAttribute("aria-pressed", "true");
        await expect(lockSpec.submit).toHaveText("Insufficient Balance");
        await expect(lockSpec.submit).toBeDisabled();
      }

      // With exactly the bronze amount, bronze opens and the others stay shut.
      await giveSpec(chain, me.ownerAddress, tiers.bronze);
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(lockSpec.balance).toHaveText(balanceShown(tiers.bronze));
      await expect(lockSpec.tierCard("Silver")).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.submit).toHaveText("Insufficient Balance");
      await expect(lockSpec.submit).toBeDisabled();
      await lockSpec.tierCard("Bronze").click();
      await expect(lockSpec.submit).toHaveText("Approve and Lock");
      await expect(lockSpec.submit).toBeEnabled();
      await lockSpec.tierCard("Gold").click();
      await expect(lockSpec.submit).toHaveText("Insufficient Balance");
      await expect(lockSpec.submit).toBeDisabled();

      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect((await currentLock(chain, me.ownerAddress)).amount).toBe(BigInt(0));
    },
  );

  test(
    'N4: "Approve and Lock" approves the tier\'s amount, locks it by itself, and the lock shows on the Claim and History tabs',
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const lockSpec = new LockSpecPage(page);
      const me = await persona("fundedMember");
      const tiers = await lockParameters(chain);
      const amount = tiers.silver;
      const duration = BigInt(3) * SECONDS_PER_YEAR;
      // The wallet holds exactly the silver amount.
      await giveSpec(chain, me.ownerAddress, amount);
      expect(await tokenAllowance(chain, SPEC_TOKEN_ADDRESS, me.ownerAddress, VIP_MANAGER_ADDRESS)).toBe(BigInt(0));
      const lockedBefore = await specBalance(chain, VIP_MANAGER_ADDRESS);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await lockSpec.open();
      await pages.shell.connect();
      // Silver for three years is the selection the page starts with.
      await expect(lockSpec.tierCard("Silver")).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.duration(3)).toHaveAttribute("aria-pressed", "true");
      await expect(lockSpec.submit).toHaveText("Approve and Lock");
      await expect(lockSpec.submit).toBeEnabled();

      // Both wallet prompts are held, to look at the chain in between.
      const approvalPrompt = wallet.holdNext("transaction");
      const lockPrompt = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await lockSpec.submit.click();

      // Step one: the approval. Nothing is locked while the wallet decides.
      await approvalPrompt.requested;
      await expect(lockSpec.submit).toHaveText("Locking...");
      await expect(lockSpec.submit).toBeDisabled();
      approvalPrompt.approve();

      // Step two comes by itself: the wallet is asked for the lock once the
      // approval is confirmed. The VIP manager may now take the amount, and
      // has not yet.
      await lockPrompt.requested;
      expect(await tokenAllowance(chain, SPEC_TOKEN_ADDRESS, me.ownerAddress, VIP_MANAGER_ADDRESS)).toBe(amount);
      expect((await currentLock(chain, me.ownerAddress)).amount).toBe(BigInt(0));
      expect(await specBalance(chain, me.ownerAddress)).toBe(amount);
      lockPrompt.approve();

      await expect(pages.shell.transactionToast("success").filter({ hasText: "Transaction successful!" })).toBeVisible({
        timeout: 60_000,
      });
      await expect(pages.shell.toast("error")).toHaveCount(0);
      expect(await seenText.matching(/Approval successful/)).not.toEqual([]);

      // Two transactions and no signature, both from the wallet itself:
      // approve(VIP manager, amount) on SPEC, then lock(amount, three years).
      const { action } = await expectOwnerApprovedThenSent(
        { wallet, chain },
        {
          persona: me,
          token: SPEC_TOKEN_ADDRESS,
          spender: VIP_MANAGER_ADDRESS,
          amount,
          to: VIP_MANAGER_ADDRESS,
          data: lockCall(amount, duration),
          ownerBalanceBefore,
        },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      // On chain: the wallet's lock, for three years from the lock's block,
      // and the SPEC is with the VIP manager.
      const locked = locksIn(action);
      expect(locked).toHaveLength(1);
      expect(isAddressEqual(locked[0].user, me.ownerAddress), "locked for the wallet").toBe(true);
      expect(locked[0].amount).toBe(amount);
      const { timestamp: lockedAt } = await chain.public.getBlock({ blockNumber: action.blockNumber });
      expect(locked[0].unlockTime).toBe(lockedAt + duration);
      expect(await currentLock(chain, me.ownerAddress)).toEqual({ amount, unlockTime: locked[0].unlockTime });
      expect((await currentLock(chain, me.address)).amount, "nothing is locked for the Society account").toBe(BigInt(0));
      expect(await specBalance(chain, me.ownerAddress)).toBe(BigInt(0));
      expect(await specBalance(chain, VIP_MANAGER_ADDRESS)).toBe(lockedBefore + amount);

      // The page: the wallet's SPEC is gone, so there is nothing left to lock.
      await expect(lockSpec.balance).toHaveText("0 SPEC");
      await expect(lockSpec.submit).toHaveText("Insufficient Balance");
      await expect(lockSpec.submit).toBeDisabled();

      // The Claim tab has the lock, and it cannot be claimed yet.
      await lockSpec.tab("Claim").click();
      await expect(lockSpec.claim).toContainText(compactSpecAmount(amount));
      await expect(lockSpec.claim).toContainText(shortDate(locked[0].unlockTime));
      await expect(lockSpec.claim.getByText("Locked", { exact: true })).toBeVisible();
      await expect(lockSpec.claimSubmit).toHaveText("Wait until lock period is over");
      await expect(lockSpec.claimSubmit).toBeDisabled();

      // The History tab lists it once the subgraph has it. The fake does not
      // follow the VIP manager, so the row is indexed here, from the lock's
      // own transaction.
      await subgraph.overlay(
        lockTransaction({
          id: action.transactionHash,
          user: me.ownerAddress,
          type: "lock",
          amount: locked[0].amount,
          lockDate: lockedAt,
          unlockDate: locked[0].unlockTime,
        }),
      );
      await lockSpec.tab("History").click();
      await expect(lockSpec.historyRows).toHaveCount(1);
      const row = lockSpec.historyRows.first();
      await expect(row).toContainText(compactSpecAmount(amount));
      await expect(row).toContainText(shortDate(lockedAt));
      await expect(row).toContainText(shortDate(locked[0].unlockTime));
      await expect(row.getByText("Lock", { exact: true })).toBeVisible();
      await expect(lockSpec.historyExplorerLink(row)).toHaveAttribute("href", `${EXPLORER_TX}${action.transactionHash}`);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction successful!" });
    },
  );

  test(
    'N5: before the lock ends the Claim tab shows the lock and only offers "Wait until lock period is over"',
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const lockSpec = new LockSpecPage(page);
      const me = await persona("fundedMember");
      const tiers = await lockParameters(chain);
      // The wallet's lock from earlier: the bronze amount for the shortest time the contract takes.
      const lock = await lockAs(chain, me.ownerAddress, { amount: tiers.bronze, durationSeconds: tiers.minDuration });
      expect(lock.unlockTime).toBeGreaterThan(lock.lockedAt);

      await lockSpec.open("claim");
      await pages.shell.connect();
      wallet.clearRequests();
      await expect(lockSpec.tab("Claim")).toHaveAttribute("aria-selected", "true");

      await expect(lockSpec.claim).toContainText("Locked Balance");
      await expect(lockSpec.claim).toContainText(compactSpecAmount(lock.amount));
      await expect(lockSpec.claim).toContainText(shortDate(lock.unlockTime));
      await expect(lockSpec.claim.getByText("Locked", { exact: true })).toBeVisible();
      await expect(lockSpec.claim).not.toContainText("Claimable");
      // No claim is on offer: the button only says to wait, and no fee is quoted.
      await expect(lockSpec.claimSubmit).toHaveText("Wait until lock period is over");
      await expect(lockSpec.claimSubmit).toBeDisabled();
      await expect(lockSpec.claim).not.toContainText("Est. Gas");
      await expect(lockSpec.simulationError).toHaveCount(0);

      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await currentLock(chain, me.ownerAddress)).toEqual({ amount: lock.amount, unlockTime: lock.unlockTime });
    },
  );

  test(
    'N7: the History tab says "No lock activity found." for a wallet that never locked',
    { tag: ["@edge"] },
    async ({ page, persona, pages }) => {
      const lockSpec = new LockSpecPage(page);
      await persona("member");
      await lockSpec.open("history");
      await pages.shell.connect();

      await expect(lockSpec.tab("History")).toHaveAttribute("aria-selected", "true");
      await expect(lockSpec.historyEmpty).toBeVisible();
      await expect(lockSpec.historyRows).toHaveCount(0);
    },
  );

  test(
    "N7: the History tab lists the wallet's locks and claims with amount, dates and a link to the transaction",
    { tag: ["@edge"] },
    async ({ page, persona, pages, chain, subgraph, nextAccount }) => {
      const lockSpec = new LockSpecPage(page);
      const me = await persona("fundedMember");
      const tiers = await lockParameters(chain);
      // A lock that is on chain, indexed from its own transaction, an older
      // claim that only the subgraph knows, and a lock of somebody else.
      const lock = await lockAs(chain, me.ownerAddress, { amount: tiers.bronze, durationSeconds: tiers.minDuration });
      const claimHash = `0x${"c1".repeat(32)}` as const;
      const claimedAt = lock.lockedAt - BigInt(30 * 86_400);
      await subgraph.overlay(
        lockTransaction({
          id: lock.hash,
          user: me.ownerAddress,
          type: "lock",
          amount: lock.amount,
          lockDate: lock.lockedAt,
          unlockDate: lock.unlockTime,
        }),
        lockTransaction({
          id: claimHash,
          user: me.ownerAddress,
          type: "claim",
          amount: tiers.silver,
          lockDate: null,
          unlockDate: claimedAt,
        }),
        lockTransaction({
          id: `0x${"d2".repeat(32)}`,
          user: nextAccount().address,
          type: "lock",
          amount: tiers.gold,
          lockDate: lock.lockedAt,
          unlockDate: lock.unlockTime,
        }),
      );

      await lockSpec.open("history");
      await pages.shell.connect();
      await expect(lockSpec.historyEmpty).toHaveCount(0);
      // Only this wallet's two rows.
      await expect(lockSpec.historyRows).toHaveCount(2);

      const lockRow = lockSpec.historyRows.filter({ has: page.getByText("Lock", { exact: true }) });
      await expect(lockRow).toContainText(compactSpecAmount(lock.amount));
      await expect(lockRow).toContainText(shortDate(lock.lockedAt));
      await expect(lockRow).toContainText(shortDate(lock.unlockTime));
      await expect(lockSpec.historyExplorerLink(lockRow)).toHaveAttribute("href", `${EXPLORER_TX}${lock.hash}`);
      await expect(lockSpec.historyExplorerLink(lockRow)).toHaveAttribute("target", "_blank");

      // A claim has no lock date.
      const claimRow = lockSpec.historyRows.filter({ has: page.getByText("Claim", { exact: true }) });
      await expect(claimRow).toContainText(compactSpecAmount(tiers.silver));
      await expect(claimRow).toContainText("—");
      await expect(claimRow).toContainText(shortDate(claimedAt));
      await expect(lockSpec.historyExplorerLink(claimRow)).toHaveAttribute("href", `${EXPLORER_TX}${claimHash}`);
    },
  );

  test(
    "N8: ?tab= opens the Lock, Claim or History tab, and choosing a tab is kept in the address",
    { tag: ["@edge"] },
    async ({ page, persona, pages }) => {
      const lockSpec = new LockSpecPage(page);
      await persona("member");

      // Each link opens its own tab, with that tab's content.
      await lockSpec.open("claim");
      await pages.shell.connect();
      await expect(lockSpec.tab("Claim")).toHaveAttribute("aria-selected", "true");
      await expect(lockSpec.tab("Lock")).toHaveAttribute("aria-selected", "false");
      await expect(lockSpec.claimSubmit).toHaveText("CLAIM SPEC");
      await expect(lockSpec.claimSubmit).toBeDisabled();
      await expect(lockSpec.submit).toHaveCount(0);

      await lockSpec.open("history");
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(lockSpec.tab("History")).toHaveAttribute("aria-selected", "true");
      await expect(lockSpec.historyEmpty).toBeVisible();
      await expect(lockSpec.claimSubmit).toHaveCount(0);

      await lockSpec.open("lock");
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(lockSpec.tab("Lock")).toHaveAttribute("aria-selected", "true");
      await expect(lockSpec.submit).toBeVisible();
      await expect(lockSpec.historyEmpty).toHaveCount(0);

      // A value that is no tab falls back to Lock.
      await lockSpec.open("nonsense");
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(lockSpec.tab("Lock")).toHaveAttribute("aria-selected", "true");
      await expect(lockSpec.submit).toBeVisible();

      // Choosing a tab writes it into the address, so the view can be linked to.
      await lockSpec.tab("Claim").click();
      await expect(page).toHaveURL(/[?&]tab=claim(&|$)/);
      await expect(lockSpec.claimSubmit).toBeVisible();
      await lockSpec.tab("History").click();
      await expect(page).toHaveURL(/[?&]tab=history(&|$)/);
      await expect(lockSpec.historyEmpty).toBeVisible();
    },
  );
});
