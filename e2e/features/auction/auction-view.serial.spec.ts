import { formatUnits, parseUnits } from "viem";
import { formatAuto } from "../../../src/utils/format";
import { expect, test } from "../../fixtures";
import {
  AUCTION_ID,
  auctionDetail,
  auctionOrder,
  buyAmountFor,
  ensureAuction,
  placeOrderAs,
} from "../../support/builders/auction";
import { decimalString, tokenBalance } from "../../support/builders/auction-tokens";
import { AuctionPage } from "../../support/pages/auction";
import { NO_AUCTION_BUILD, runningAuction, shown, validBid } from "./steps";

/**
 * /auction as a visitor sees it: the page of a build without an auction,
 * the inactive view, the running auction's numbers, the guard around the
 * bid form, the form's validation and "Your Bids".
 *
 * Whether the app has an auction at all is compiled into it
 * (NEXT_PUBLIC_AUCTION_ID), so one build can run either M1 or M2 to M10,
 * never both: the group that does not fit the build skips itself. What the
 * page shows about a configured auction comes from the subgraph fake, which
 * does not follow the EasyAuction contract; the tests put the auction there
 * (support/builders/auction.ts), built from the auction that is on chain.
 *
 * These are *.serial.spec.ts because the bids of auction-bids.serial.spec.ts
 * change the one auction every test of the area reads, so the two files
 * must not run at the same time on one stack. They do not rely on each
 * other's order: with one worker the bids file runs first, with several the
 * two may run on different stacks, and every test here puts the auction
 * state it reads into the fake itself.
 */
const now = () => Math.floor(Date.now() / 1000);
const DAY = 86_400;

test.describe("auction: a build without an auction id", () => {
  test.skip(AUCTION_ID !== undefined, `this build has auction ${AUCTION_ID} configured, so /auction is never "Coming soon"`);

  test(
    'M1: without an auction id the page announces the ICO as "Coming soon" and offers nothing to bid on',
    { tag: ["@smoke"] },
    async ({ page, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      await auctionPage.open();

      await expect(auctionPage.heading).toHaveText("SPEC ICO Auction");
      await expect(auctionPage.comingSoon).toBeVisible();
      await expect(page.getByText("Stay tuned for updates!")).toBeVisible();
      // The copy next to it is served by /api/copywriting/ico.
      await expect(page.getByText("The ICO will sell 31% of the entire SPEC token supply.")).toBeVisible();

      // No auction: no countdown, no numbers, no bid form, and the sidebar says so.
      await expect(auctionPage.statusChip).toHaveText("Inactive");
      await expect(auctionPage.countdown).toHaveCount(0);
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.yourBids).toHaveCount(0);
      await expect(auctionPage.auctionIdLine).toHaveCount(0);

      // And nothing about an auction was asked of the subgraph.
      const asked = (await subgraph.requests()).map((request) => request.operationName);
      expect(asked.filter((name) => name === "Auction" || name === "AuctionStatus" || name === "Orders")).toEqual([]);
    },
  );
});

test.describe("auction: the configured auction", () => {
  test.skip(AUCTION_ID === undefined, NO_AUCTION_BUILD);

  test(
    "M2: an auction the subgraph does not know shows the inactive view, and the sidebar says Inactive",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      // Nothing in the fake: the configured auction has not been indexed.
      await auctionPage.open();

      await expect(auctionPage.heading).toHaveText("SPEC Token Auction");
      await expect(auctionPage.countdown).toContainText(/The auction kicks off on [A-Z][a-z]+ \d{1,2}, \d{4}, at .+ CET!/);
      await expect(page.getByText("SPEC Token fundamentals")).toBeVisible();
      await expect(page.getByText("Tokenomics & governance")).toBeVisible();
      await expect(auctionPage.statusChip).toHaveText("Inactive");

      // Nothing of a running auction.
      await expect(auctionPage.auctionIdLine).toHaveCount(0);
      await expect(auctionPage.stat("Min Price")).toHaveCount(0);
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.yourBids).toHaveCount(0);

      // The page asked for the auction the build was made for.
      const lookups = (await subgraph.requests()).filter((request) => request.operationName === "Auction");
      expect(lookups.length).toBeGreaterThan(0);
      expect(String(lookups[0].variables.id)).toBe(String(AUCTION_ID));
    },
  );

  test(
    "M2: an auction that has ended shows the inactive view, and the sidebar says Ended",
    { tag: ["@core"] },
    async ({ page, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      await runningAuction(
        { chain, subgraph },
        {
          startingTimeStamp: String(now() - 10 * DAY),
          endTimeTimestamp: String(now() - DAY),
          orderCancellationEndDate: String(now() - DAY),
        },
      );
      await auctionPage.open();

      await expect(auctionPage.statusChip).toHaveText("Ended");
      await expect(auctionPage.heading).toHaveText("SPEC Token Auction");
      await expect(page.getByText("SPEC Token fundamentals")).toBeVisible();
      await expect(auctionPage.auctionIdLine).toHaveCount(0);
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.yourBids).toHaveCount(0);
    },
  );

  test(
    "M2: an auction that has not started yet shows the inactive view with the date it kicks off",
    { tag: ["@core"] },
    async ({ page, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      const start = now() + 30 * DAY;
      await runningAuction(
        { chain, subgraph },
        { startingTimeStamp: String(start), endTimeTimestamp: String(start + 30 * DAY) },
      );
      await auctionPage.open();

      await expect(auctionPage.heading).toHaveText("SPEC Token Auction");
      await expect(page.getByText("SPEC Token fundamentals")).toBeVisible();
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.countdown).toContainText("The auction kicks off on");

      // APP BUG, expected to fail until it is fixed: the inactive view does
      // not read the auction. InactiveAuction.tsx has the start written into
      // it (startTimestamp = 1772323200, 1 March 2026), so the page says
      // "kicks off on March 1, 2026" and counts down to zero for an auction
      // that starts a month from now. Everything above this line must pass.
      test.fail(true, "the kickoff date of the inactive view is a constant, not the auction's startingTimeStamp");
      const kickoff = new Date(start * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Europe/Paris",
      });
      // Short on purpose: a fixed app has the date on screen with the view.
      // Remove this timeout together with test.fail.
      await expect(auctionPage.countdown).toContainText(`The auction kicks off on ${kickoff}`, { timeout: 2_000 });
      await expect(auctionPage.countdownCell(/^(29|30) days$/)).toBeVisible({ timeout: 2_000 });
    },
  );

  test(
    "M2: the sidebar does not call an auction Active before it has started",
    { tag: ["@core"] },
    async ({ page, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      const start = now() + 30 * DAY;
      await runningAuction(
        { chain, subgraph },
        { startingTimeStamp: String(start), endTimeTimestamp: String(start + 30 * DAY) },
      );
      await auctionPage.open();

      // The page itself treats it as not running.
      await expect(page.getByText("SPEC Token fundamentals")).toBeVisible();
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.statusChip).toBeVisible();

      // APP BUG, expected to fail until it is fixed: useAuctionStatus only
      // compares the end time with now (and its query does not ask for
      // startingTimeStamp), so an auction that has not started is "Active"
      // in the sidebar while its page shows the inactive view.
      test.fail(true, 'the sidebar chip says "Active" for an auction that has not started (useAuctionStatus)');
      // What the title claims, and no more: any label but "Active" is a fix
      // ("Inactive", "Upcoming", "Not started" are the owner's choice).
      // Short on purpose: the chip is on screen already. Remove with test.fail.
      await expect(auctionPage.statusChip).not.toHaveText(/^\s*Active\s*$/, { timeout: 2_000 });
    },
  );

  test(
    "M3: a running auction shows its clearing price, bidding token, countdown, totals and the demand chart",
    { tag: ["@core"] },
    async ({ page, chain, subgraph, nextAccount }) => {
      const auctionPage = new AuctionPage(page);
      const auction = await ensureAuction(chain);
      const sold = auction.auctioningToken;
      const bidding = auction.biddingToken;

      // What the subgraph reports about the bidding so far: three bids of
      // other people around a clearing price of one and a half times the
      // minimum, and an end two days, three and a half hours from now.
      const clearing = (auction.minPrice * BigInt(3)) / BigInt(2);
      const clearingPrice = decimalString(clearing, BigInt(10) ** BigInt(bidding.decimals));
      const bidsSoFar = auction.minBid * BigInt(3_000);
      const end = now() + 2 * DAY + 3 * 3_600 + 30 * 60;
      const prices = [(auction.minPrice * BigInt(6)) / BigInt(5), clearing, auction.minPrice * BigInt(2)];
      await subgraph.overlay(
        auctionDetail(auction, {
          currentClearingPrice: clearingPrice,
          currentBiddingAmount: String(bidsSoFar),
          endTimeTimestamp: String(end),
        }),
        ...prices.map((price, index) => {
          const sellAmount = auction.minBid * BigInt(1_000);
          return auctionOrder(
            auction,
            { userId: BigInt(900_001 + index), sellAmount, buyAmount: buyAmountFor(auction, sellAmount, price) },
            { user: nextAccount().address, timestamp: now() - 3_600 },
          );
        }),
      );

      await auctionPage.open();

      await expect(auctionPage.heading).toHaveText("SPEC Token Auction");
      await expect(auctionPage.auctionIdLine).toHaveText(`Sepolia - Auction id #${AUCTION_ID}`);
      await expect(auctionPage.statusChip).toHaveText("Active");

      // The numbers, each under its label.
      const pair = `${bidding.symbol}/${sold.symbol}`;
      await expect(auctionPage.stat("Current Clearing Price")).toContainText(
        `${shown(clearing, bidding.decimals)} ${pair}`,
      );
      await expect(auctionPage.stat("Bidding With")).toContainText(bidding.symbol);
      await expect(auctionPage.stat("Min Price")).toContainText(`${shown(auction.minPrice, bidding.decimals)} ${pair}`);
      // Total auctioned: what the bids buy at the clearing price, capped at what is for sale.
      const bought =
        (bidsSoFar * BigInt(10) ** BigInt(sold.decimals)) / parseUnits(clearingPrice, bidding.decimals);
      const total = bought < auction.initialOrder.sellAmount ? bought : auction.initialOrder.sellAmount;
      expect(total, "the overlay keeps the total below the cap, so that it depends on the bids").toBe(bought);
      await expect(auctionPage.stat("Total Auctioned")).toContainText(`${shown(total, sold.decimals)} ${sold.symbol}`);

      // The countdown to the end, and it is running.
      await expect(auctionPage.countdown).toContainText("ENDS IN");
      await expect(auctionPage.countdownCell("02 days")).toBeVisible();
      await expect(auctionPage.countdownCell("03 hours")).toBeVisible();
      await expect(auctionPage.countdownCell(/^(29|30) minutes$/)).toBeVisible();
      const seconds = auctionPage.countdownCell(/^\d{2} seconds$/);
      const first = await seconds.getAttribute("aria-label");
      await expect(seconds).not.toHaveAttribute("aria-label", first!);

      // The demand chart, with the clearing price marked on it.
      await expect(auctionPage.chartVolumeAxisLabel).toBeVisible();
      await expect(auctionPage.chartClearingPriceLabel).toHaveText(
        `Clearing Price: ${formatAuto(Number(clearingPrice))} USDC`,
      );
    },
  );

  test(
    "M4: the bid form asks a visitor to connect, and a connected wallet on the wrong network to switch",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      await persona("fundedMember");
      await runningAuction({ chain, subgraph });
      await auctionPage.open();

      // Logged out: the auction's numbers are public, the form is not there.
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await expect(pages.shell.connectPrompt).toContainText("Connect your wallet to place a bid.");
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.yourBids).toHaveCount(0);

      // Connected on Sepolia: the form and the list of bids.
      await pages.shell.connect();
      await expect(auctionPage.bidForm).toBeVisible();
      await expect(auctionPage.yourBids).toBeVisible();
      await expect(pages.shell.connectPrompt).toHaveCount(0);

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      await wallet.setChainId(1);
      await expect(pages.shell.wrongNetworkPrompt).toContainText("Please switch to the correct network to place a bid.");
      await expect(pages.shell.wrongNetworkPrompt).toContainText("Please switch to Sepolia to continue.");
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      await expect(auctionPage.bidForm).toHaveCount(0);
      await expect(auctionPage.submit).toHaveCount(0);

      // Switching back from the prompt brings the form back.
      wallet.clearRequests();
      await pages.shell.switchNetworkButton.click();
      await expect(pages.shell.wrongNetworkPrompt).toHaveCount(0);
      await expect(auctionPage.bidForm).toBeVisible();
      expect(wallet.requestsOf("wallet_switchEthereumChain").map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "M5: a bid at or below the minimum amount or price is refused with the limit, and the amount cannot exceed the wallet's balance",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain, subgraph }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const { address: token, decimals, symbol } = auction.biddingToken;
      // The wallet holds five times the minimum bid of the bidding token.
      const balance = auction.minBid * BigInt(5);
      await chain.setErc20Balance(token, me.ownerAddress, balance);

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      wallet.clearRequests();

      // The limits and the wallet's balance are on the form.
      await expect(auctionPage.bidForm).toContainText(`Minimum bid amount: ${shown(auction.minBid, decimals)} ${symbol}`);
      await expect(auctionPage.bidForm).toContainText(`Minimum price: ${shown(auction.minPrice, decimals)} ${symbol}`);
      await expect(auctionPage.bidForm).toContainText(
        new RegExp(`Balance:\\s*${shown(balance, decimals).replace(/[.]/g, "\\.")} ${symbol}`),
      );

      // Exactly the minimum bid is not enough: a bid must be larger.
      await auctionPage.fillBid(formatUnits(auction.minBid, decimals), formatUnits(auction.minPrice * BigInt(2), decimals));
      await auctionPage.amountInput.focus();
      await auctionPage.amountInput.blur();
      await expect(auctionPage.amountField).toContainText(
        `Bid amount must be greater than minimum bid of ${formatUnits(auction.minBid, decimals)}`,
      );
      await expect(auctionPage.submit).toBeDisabled();

      // A valid amount at exactly the minimum price: the price must be higher.
      await auctionPage.fillBid(
        formatUnits(auction.minBid * BigInt(2), decimals),
        formatUnits(auction.minPrice, decimals),
      );
      await expect(auctionPage.amountField).not.toContainText("Bid amount must be greater");
      await expect(auctionPage.priceField).toContainText(
        `Price must be greater than minimum price of ${formatUnits(auction.minPrice, decimals)}`,
      );
      await expect(auctionPage.submit).toBeDisabled();

      // More than the wallet holds: the amount is cut down to the balance.
      await auctionPage.fillBid(formatUnits(balance * BigInt(3), decimals), formatUnits(auction.minPrice * BigInt(2), decimals));
      await auctionPage.amountInput.focus();
      await auctionPage.amountInput.blur();
      await expect(auctionPage.amountInput).toHaveValue(formatUnits(balance, decimals));
      await expect(auctionPage.priceField).not.toContainText("Price must be greater");

      // That is a bid the auction takes: the form says what it buys and
      // offers the approval. Nothing has been asked of the wallet so far.
      const buys = buyAmountFor(auction, balance, auction.minPrice * BigInt(2));
      await expect(auctionPage.bidForm).toContainText(
        `You will receive approximately ${shown(buys, auction.auctioningToken.decimals)} SPEC`,
      );
      await expect(auctionPage.submit).toHaveText("Approve");
      await expect(auctionPage.submit).toBeEnabled();
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(await tokenBalance(chain, token, me.ownerAddress)).toBe(balance);
    },
  );

  test(
    "M10: Your Bids is empty for a wallet without bids, and lists the wallet's own bids as Placed",
    { tag: ["@edge"] },
    async ({ page, persona, pages, chain, subgraph, nextAccount }) => {
      const auctionPage = new AuctionPage(page);
      const me = await persona("fundedMember");
      const auction = await runningAuction({ chain, subgraph });
      const { decimals, symbol } = auction.biddingToken;

      await auctionPage.open();
      await expect(auctionPage.stat("Min Price")).toBeVisible();
      await pages.shell.connect();
      await expect(auctionPage.noBids).toBeVisible();
      await expect(auctionPage.bidRows).toHaveCount(0);

      // Two bids of this wallet, placed on chain, and one of somebody else
      // that only the subgraph knows: indexed, they are in the list after a
      // reload (the page keeps what it read until something changes it).
      const bid = validBid(auction);
      const larger = { sellAmount: bid.sellAmount * BigInt(2), price: bid.price * BigInt(2) };
      const first = await placeOrderAs(chain, auction, me.ownerAddress, bid);
      const second = await placeOrderAs(chain, auction, me.ownerAddress, larger);
      await subgraph.overlay(
        auctionOrder(auction, first.order, { user: me.ownerAddress, timestamp: first.timestamp }),
        auctionOrder(auction, second.order, { user: me.ownerAddress, timestamp: second.timestamp }),
        auctionOrder(
          auction,
          { userId: BigInt(900_100), sellAmount: bid.sellAmount * BigInt(3), buyAmount: bid.buyAmount },
          { user: nextAccount().address, timestamp: now() },
        ),
      );
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();

      await expect(auctionPage.bidRows).toHaveCount(2);
      await expect(auctionPage.noBids).toHaveCount(0);
      const perToken = `per 1 ${auction.auctioningToken.symbol}`;
      const firstRow = auctionPage.bidRow(bid.amountShown);
      await expect(firstRow).toContainText(`${formatAuto(formatUnits(bid.price, decimals))} ${symbol} ${perToken}`);
      await expect(firstRow).toContainText("Placed");
      await expect(auctionPage.cancelButton(firstRow)).toHaveText("Cancel");
      const secondRow = auctionPage.bidRow(`${formatAuto(formatUnits(larger.sellAmount, decimals))} ${symbol}`);
      await expect(secondRow).toContainText(`${formatAuto(formatUnits(larger.price, decimals))} ${symbol} ${perToken}`);
      await expect(secondRow).toContainText("Placed");
      // The other bidder's amount is nowhere in the list.
      await expect(auctionPage.yourBids).not.toContainText(
        `${formatAuto(formatUnits(bid.sellAmount * BigInt(3), decimals))} ${symbol}`,
      );
    },
  );
});
