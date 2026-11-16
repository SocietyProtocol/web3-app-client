import { expect, test } from "../../fixtures";
import {
  AUCTION_ID,
  EASY_AUCTION_ADDRESS,
  auctionOrder,
  cancelOrderCall,
  orderExists,
  placeOrderAs,
  placeOrderCall,
} from "../../support/builders/auction";
import { approveAs, approveCall, tokenAllowance, tokenBalance } from "../../support/builders/auction-tokens";
import { AuctionPage } from "../../support/pages/auction";
import {
  asked,
  expectNeverAskedToFundSocietyAccount,
  expectOwnerApprovedThenSent,
  expectOwnerSentDirectly,
} from "../../support/write-route";
import {
  NO_AUCTION_BUILD,
  indexCancelledBid,
  indexPlacedBid,
  runningAuction,
  validBid,
} from "./steps";

/**
 * Bidding in the auction: approve, place, cancel, and saying no in the
 * wallet.
 *
 * The auction is not an Outpost contract, so every write here goes the
 * "owner" route: the wallet itself sends an ordinary transaction to the
 * token or to the EasyAuction contract, pays its fee, and the Society
 * account plays no part. The bidding token sits on the wallet too.
 *
 * "Appears in Your Bids" needs the subgraph, and the fake does not follow
 * the EasyAuction contract. So the tests hold the fake's `_meta` back while
 * the page waits for the subgraph ("Syncing..."), index the order from the
 * transaction's own events (steps.ts: indexPlacedBid / indexCancelledBid),
 * and then let the fake catch up: what the page lists afterwards is what
 * it read after its own write, built from what the contract emitted.
 *
 * Serial: every bid changes the one auction that all tests of the area use.
 */
test.describe("auction: bids", () => {
  test.skip(AUCTION_ID === undefined, NO_AUCTION_BUILD);

  test(
    "M6: a first bid approves the bidding token, places the bid by itself once the approval is confirmed, and appears in Your Bids",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const token = auction.biddingToken.address;
      const bid = validBid(auction);
      await chain.setErc20Balance(token, me.ownerAddress, bid.sellAmount * BigInt(2));
      expect(await tokenAllowance(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS)).toBe(BigInt(0));
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      await expect(auctionPage.noBids).toBeVisible();
      await auctionPage.fillBid(bid.amount, bid.priceTyped);
      // Without an allowance the button offers the approval first.
      await expect(auctionPage.submit).toHaveText("Approve");
      await expect(auctionPage.submit).toBeEnabled();

      // Both wallet prompts are held, to look at the page in between.
      const approvalPrompt = wallet.holdNext("transaction");
      const bidPrompt = wallet.holdNext("transaction");
      let bidAsked = false;
      void bidPrompt.requested.then(() => (bidAsked = true));
      await subgraph.setMeta({ freeze: true });
      wallet.clearRequests();
      aa.clear();
      await auctionPage.submit.click();

      // Step one: the approval of exactly the bid's amount.
      await approvalPrompt.requested;
      await expect(auctionPage.submit).toHaveText("Approving...");
      await expect(auctionPage.submit).toBeDisabled();
      approvalPrompt.approve();
      await expect(
        pages.shell.toast("success").filter({ hasText: "Approval confirmed, placing bid..." }).first(),
      ).toBeVisible({ timeout: 60_000 });
      await expect(auctionPage.feedback).toContainText("Approval confirmed");
      const [approval] = wallet.sendTransactionRequests();
      expect(approval.outcome).toBe("ok");
      expect(asked(approval).to?.toLowerCase()).toBe(token.toLowerCase());
      expect(asked(approval).data?.toLowerCase()).toBe(approveCall(EASY_AUCTION_ADDRESS, bid.sellAmount).toLowerCase());
      await chain.receipt(approval.hash!);
      expect(await tokenAllowance(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS)).toBe(bid.sellAmount);
      expect(await tokenBalance(chain, token, me.ownerAddress), "nothing is spent yet").toBe(
        bid.sellAmount * BigInt(2),
      );

      // SUSPECTED, NOT CONFIRMED (suspected-app-bugs.md, M6): the bid may
      // never be placed by itself. useBidMutation's effect announces
      // "Approval confirmed, placing bid..." and calls placeBid() while the
      // approval is still "approving"; placeBid() returns at once in exactly
      // that state (`transaction.isLoading` is true as long as the approval
      // executes), and when the approval is done the effect's condition is
      // no longer met. Found by reading only: until the running auction's
      // page stopped crashing (string decimals from the subgraph), no run
      // got this far. So it is not marked test.fail here. Run this: if it
      // fails at this poll, that confirms it, and the poll gets test.fail
      // with a 5 s timeout (a fixed app asks the wallet right after the
      // approval's receipt, which it has by now).
      await expect.poll(() => bidAsked, { message: "the wallet is asked for the bid" }).toBe(true);

      // Step two: the bid itself, and the wait for the subgraph.
      bidPrompt.approve();
      await expect(auctionPage.submit).toHaveText("Syncing...", { timeout: 60_000 });
      const data = placeOrderCall(auction, bid);
      const { action } = await expectOwnerApprovedThenSent(
        { wallet, chain },
        {
          persona: me,
          token,
          spender: EASY_AUCTION_ADDRESS,
          amount: bid.sellAmount,
          to: EASY_AUCTION_ADDRESS,
          data,
          ownerBalanceBefore,
        },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      // On chain: the order is in the auction's book under this wallet, and
      // the contract took the tokens.
      const order = await indexPlacedBid({ chain, subgraph }, auction, action, me.ownerAddress);
      expect(order.sellAmount).toBe(bid.sellAmount);
      expect(order.buyAmount).toBe(bid.buyAmount);
      expect(await orderExists(chain, auction, order)).toBe(true);
      expect(await tokenBalance(chain, token, me.ownerAddress)).toBe(bid.sellAmount);

      // The subgraph catches up: the page reports the bid and lists it.
      await subgraph.unfreeze();
      await expect(auctionPage.submit).toHaveText("Bid Placed!", { timeout: 60_000 });
      await expect(auctionPage.feedback).toContainText("Bid placed successfully!");
      await expect(pages.shell.toast("error")).toHaveCount(0);
      await expect(auctionPage.bidRows).toHaveCount(1);
      await expect(auctionPage.bidRow(bid.amountShown)).toContainText("Placed");

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Approval confirmed, placing bid..." });
    },
  );

  test(
    "M7: with an allowance in place a bid is one transaction of the wallet, and appears in Your Bids",
    { tag: ["@edge", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const token = auction.biddingToken.address;
      const bid = validBid(auction);
      // The wallet holds twice the bid and has approved the contract for it earlier.
      await chain.setErc20Balance(token, me.ownerAddress, bid.sellAmount * BigInt(2));
      await approveAs(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS, bid.sellAmount);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      await expect(auctionPage.noBids).toBeVisible();
      await auctionPage.fillBid(bid.amount, bid.priceTyped);
      // No approval is offered: the button places the bid.
      await expect(auctionPage.submit).toHaveText("Place Bid");
      await expect(auctionPage.submit).toBeEnabled();
      await expect(auctionPage.simulationError).toHaveCount(0);

      await subgraph.setMeta({ freeze: true });
      wallet.clearRequests();
      aa.clear();
      await auctionPage.submit.click();
      // The transaction is mined, and the page waits for the subgraph.
      await expect(auctionPage.submit).toHaveText("Syncing...", { timeout: 60_000 });
      await expect(auctionPage.submit).toBeDisabled();

      // One transaction and no signature: from the wallet straight to the
      // auction contract, with exactly this bid as its data.
      const receipt = await expectOwnerSentDirectly(
        { wallet, chain },
        { persona: me, to: EASY_AUCTION_ADDRESS, ownerBalanceBefore },
      );
      expect(asked(wallet.sendTransactionRequests()[0]).data?.toLowerCase()).toBe(
        placeOrderCall(auction, bid).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      // On chain: the order is in the auction's book, the tokens are with
      // the contract, and the allowance is used up.
      const order = await indexPlacedBid({ chain, subgraph }, auction, receipt, me.ownerAddress);
      expect(order.sellAmount).toBe(bid.sellAmount);
      expect(order.buyAmount).toBe(bid.buyAmount);
      expect(await orderExists(chain, auction, order)).toBe(true);
      expect(await tokenBalance(chain, token, me.ownerAddress)).toBe(bid.sellAmount);
      expect(await tokenAllowance(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS)).toBe(BigInt(0));

      // The subgraph catches up: success, an emptied form, and the bid in the list.
      await subgraph.unfreeze();
      await expect(pages.shell.transactionToast("success")).toHaveText("Transaction successful!", { timeout: 60_000 });
      await expect(auctionPage.submit).toHaveText("Bid Placed!");
      await expect(auctionPage.feedback).toContainText("Bid placed successfully!");
      await expect(auctionPage.amountInput).toHaveValue("");
      await expect(auctionPage.priceInput).toHaveValue("");
      await expect(pages.shell.toast("error")).toHaveCount(0);
      await expect(auctionPage.noBids).toHaveCount(0);
      await expect(auctionPage.bidRows).toHaveCount(1);
      await expect(auctionPage.bidRow(bid.amountShown)).toContainText("Placed");
      expect(await seenText.matching(/Approval (confirmed|successful)|Step \d of 2/)).toEqual([]);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction successful!" });
    },
  );

  test(
    "M8: cancelling a bid is one transaction of the wallet; the bid leaves the list and the tokens come back",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const token = auction.biddingToken.address;
      const bid = validBid(auction);
      // The wallet's bid from earlier: placed on chain, and indexed.
      const placed = await placeOrderAs(chain, auction, me.ownerAddress, bid);
      await subgraph.overlay(auctionOrder(auction, placed.order, { user: me.ownerAddress, timestamp: placed.timestamp }));
      const tokensBefore = await tokenBalance(chain, token, me.ownerAddress);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      const row = auctionPage.bidRow(bid.amountShown);
      await expect(row).toContainText("Placed");
      const cancel = auctionPage.cancelButton(row);
      await expect(cancel).toHaveText("Cancel");
      await expect(cancel).toBeEnabled();

      await subgraph.setMeta({ freeze: true });
      wallet.clearRequests();
      aa.clear();
      await cancel.click();
      await expect.poll(() => wallet.sendTransactionRequests().map((request) => request.outcome)).toEqual(["ok"]);
      await expect(cancel).toHaveText("Canceling...");

      // One transaction and no signature, from the wallet straight to the
      // auction contract: cancelSellOrders with this order.
      const receipt = await expectOwnerSentDirectly(
        { wallet, chain },
        { persona: me, to: EASY_AUCTION_ADDRESS, ownerBalanceBefore },
      );
      expect(asked(wallet.sendTransactionRequests()[0]).data?.toLowerCase()).toBe(
        cancelOrderCall(auction, placed.order).toLowerCase(),
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      // On chain the order is gone and the wallet has its tokens back.
      const cancelled = await indexCancelledBid({ subgraph }, auction, receipt);
      expect(cancelled).toEqual(placed.order);
      expect(await orderExists(chain, auction, placed.order)).toBe(false);
      expect(await tokenBalance(chain, token, me.ownerAddress)).toBe(tokensBefore + bid.sellAmount);

      // The subgraph catches up: success, and the list is empty again.
      await subgraph.unfreeze();
      await expect(pages.shell.transactionToast("success")).toHaveText("Bid canceled successfully", { timeout: 60_000 });
      await expect(auctionPage.bidRows).toHaveCount(0);
      await expect(auctionPage.noBids).toBeVisible();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Bid canceled successfully" });
    },
  );

  test(
    "M8: after the cancellation period Cancel is disabled and says why",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      // The subgraph reports that cancelling ended a minute ago. (On chain
      // the bid could still be cancelled: the page must not offer it.)
      const auction = await runningAuction(
        { chain, subgraph },
        { orderCancellationEndDate: String(Math.floor(Date.now() / 1000) - 60) },
      );
      const bid = validBid(auction);
      const placed = await placeOrderAs(chain, auction, me.ownerAddress, bid);
      await subgraph.overlay(auctionOrder(auction, placed.order, { user: me.ownerAddress, timestamp: placed.timestamp }));

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      wallet.clearRequests();
      const row = auctionPage.bidRow(bid.amountShown);
      await expect(row).toContainText("Placed");
      await expect(auctionPage.cancelButton(row)).toHaveText("Cancel");
      await expect(auctionPage.cancelButton(row)).toBeDisabled();

      await auctionPage.cancelTooltipAnchor(row, "Cancellation period has ended").hover();
      await expect(page.getByRole("tooltip")).toHaveText("Cancellation period has ended");

      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await orderExists(chain, auction, placed.order)).toBe(true);
    },
  );

  test(
    "M8: on the wrong network Cancel is disabled and asks for the right network",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const bid = validBid(auction);
      const placed = await placeOrderAs(chain, auction, me.ownerAddress, bid);
      await subgraph.overlay(auctionOrder(auction, placed.order, { user: me.ownerAddress, timestamp: placed.timestamp }));

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      const row = auctionPage.bidRow(bid.amountShown);
      await expect(auctionPage.cancelButton(row)).toBeEnabled();

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      await wallet.setChainId(1);
      wallet.clearRequests();
      // The bid is still listed, but it cannot be cancelled from here.
      await expect(row).toContainText("Placed");
      await expect(auctionPage.cancelButton(row)).toBeDisabled();
      await auctionPage.cancelTooltipAnchor(row, "Switch to the correct network to cancel your bid").hover();
      await expect(page.getByRole("tooltip")).toHaveText("Switch to the correct network to cancel your bid");

      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await orderExists(chain, auction, placed.order)).toBe(true);
    },
  );

  test(
    "M9: declining the approval in the wallet approves nothing and leaves the form ready",
    { tag: ["@edge"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const token = auction.biddingToken.address;
      const bid = validBid(auction);
      await chain.setErc20Balance(token, me.ownerAddress, bid.sellAmount);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      await auctionPage.fillBid(bid.amount, bid.priceTyped);
      await expect(auctionPage.submit).toHaveText("Approve");
      await expect(auctionPage.submit).toBeEnabled();

      wallet.clearRequests();
      aa.clear();
      wallet.rejectNextTransaction();
      await auctionPage.submit.click();
      await expect(pages.shell.toast("error")).toContainText("User rejected the request");

      // The wallet was asked once and said no. Nothing was approved or
      // spent, and no bid was placed by other means.
      expect(wallet.sendTransactionRequests().map((request) => request.outcome)).toEqual(["rejected"]);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await tokenAllowance(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS)).toBe(BigInt(0));
      expect(await tokenBalance(chain, token, me.ownerAddress)).toBe(bid.sellAmount);
      expect(await chain.balance(me.ownerAddress)).toBe(ownerBalanceBefore);
      expect(await seenText.matching(/Approval confirmed|Approval successful|Bid placed/)).toEqual([]);

      // The form keeps what was typed and offers the approval again.
      await expect(auctionPage.amountInput).toHaveValue(bid.amount);
      await expect(auctionPage.submit).toHaveText("Approve");
      await expect(auctionPage.submit).toBeEnabled();
      await expect(auctionPage.noBids).toBeVisible();
    },
  );

  test(
    "M9: declining the bid in the wallet places nothing and leaves the form ready",
    { tag: ["@edge"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const token = auction.biddingToken.address;
      const bid = validBid(auction);
      await chain.setErc20Balance(token, me.ownerAddress, bid.sellAmount);
      await approveAs(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS, bid.sellAmount);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      await auctionPage.fillBid(bid.amount, bid.priceTyped);
      await expect(auctionPage.submit).toHaveText("Place Bid");
      await expect(auctionPage.submit).toBeEnabled();

      wallet.clearRequests();
      aa.clear();
      wallet.rejectNextTransaction();
      await auctionPage.submit.click();
      await expect(pages.shell.toast("error")).toContainText("User rejected the request");

      // The wallet was asked once and said no: the tokens and the allowance
      // are where they were, and the auction has no order of this wallet.
      expect(wallet.sendTransactionRequests().map((request) => request.outcome)).toEqual(["rejected"]);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await tokenBalance(chain, token, me.ownerAddress)).toBe(bid.sellAmount);
      expect(await tokenAllowance(chain, token, me.ownerAddress, EASY_AUCTION_ADDRESS)).toBe(bid.sellAmount);
      expect(await chain.balance(me.ownerAddress)).toBe(ownerBalanceBefore);
      expect(await seenText.matching(/Bid placed|Bid Placed|Transaction successful/)).toEqual([]);

      // The form keeps what was typed and offers the bid again.
      await expect(auctionPage.amountInput).toHaveValue(bid.amount);
      await expect(auctionPage.submit).toHaveText("Place Bid");
      await expect(auctionPage.submit).toBeEnabled();
      await expect(auctionPage.noBids).toBeVisible();
    },
  );
});
