import { expect } from "@playwright/test";
import { formatUnits, type Address, type TransactionReceipt } from "viem";
import { formatAuto } from "../../../src/utils/format";
import type { SubgraphFake } from "../../support/backends/subgraph";
import {
  auctionDetail,
  auctionOrder,
  buyAmountFor,
  ensureAuction,
  ordersIn,
  subgraphOrderId,
  type AuctionDetailFields,
  type AuctionOnChain,
  type ChainOrder,
} from "../../support/builders/auction";
import { remove, unlink } from "../../support/builders/entities";
import type { Chain } from "../../support/chain/chain";

/**
 * Steps the auction specs share. Not a spec: files here that do not end in
 * .spec.ts are not collected. The check of the approve-then-act route is
 * expectOwnerApprovedThenSent in support/write-route.ts.
 */

/** Why the tests that need an auction skip themselves in a build without one. */
export const NO_AUCTION_BUILD =
  "the suite's app build has no auction id: set `auction.id` in e2e/env/hermetic.json " +
  "(see e2e/support/builders/auction.ts)";

/**
 * APP BUG, the reason of the expected failures in M3 to M10: the page of a
 * running auction crashes ("Something went wrong: `decimals` must be a
 * non-negative integer. Got `18`.") as soon as its numbers render.
 * decimalsAuctioningToken and decimalsBiddingToken are BigInt fields of the
 * subgraph, which come as strings ("18"), and the graph client types them as
 * `any`. ActiveAuction.tsx passes them unconverted to FormattedNumber's
 * scaleDownDecimals (Total Auctioned, Min Price; BidControl.tsx does the same
 * for "You will receive approximately"), FormattedNumber calls viem's
 * formatUnits with them, and the viem the lockfile resolves (2.56.3) throws
 * on a decimals that is not an integer. Each of those tests is marked
 * test.fail at the first step that needs the running auction's page, with a
 * 5 second timeout (the page needs the subgraph's answer first). What comes
 * after that step has never run: remove the test.fail and the timeout when
 * the page is fixed, and verify the rest then.
 */
export const RUNNING_AUCTION_CRASH =
  'the page of a running auction crashes: a string "decimals" from the subgraph reaches formatUnits (ActiveAuction.tsx)';

/**
 * The auction the app was built for, open on chain, and in the subgraph
 * fake as a running auction (or with the dates and totals of `fields`).
 */
export async function runningAuction(
  deps: { chain: Chain; subgraph: SubgraphFake },
  fields: Partial<AuctionDetailFields> = {},
): Promise<AuctionOnChain> {
  const auction = await ensureAuction(deps.chain);
  await deps.subgraph.overlay(auctionDetail(auction, fields));
  return auction;
}

/** A number the way the auction page prints its amounts and prices: up to four decimals. */
export function shown(value: bigint, decimals: number): string {
  return formatAuto(formatUnits(value, decimals), { maxDecimals: 4, minThreshold: 0.0001 });
}

/**
 * A bid that the auction accepts: fifteen times the minimum bid at twice
 * the minimum price. `amount` and `price` are what a user types;
 * `amountShown` is the amount as "Your Bids" prints it.
 */
export function validBid(auction: AuctionOnChain) {
  const { decimals, symbol } = auction.biddingToken;
  const sellAmount = auction.minBid * BigInt(15);
  const price = auction.minPrice * BigInt(2);
  return {
    sellAmount,
    price,
    buyAmount: buyAmountFor(auction, sellAmount, price),
    amount: formatUnits(sellAmount, decimals),
    priceTyped: formatUnits(price, decimals),
    amountShown: `${formatAuto(formatUnits(sellAmount, decimals))} ${symbol}`,
  };
}

/**
 * Plays the subgraph for a bid the page just placed: reads the order out of
 * the transaction's events and adds it to the fake, as the real indexer
 * would. The fake does not follow the EasyAuction contract. Call it while
 * the fake's `_meta` is frozen (subgraph.setMeta({ freeze: true })), so
 * that the page is still waiting for the subgraph and reads the orders
 * only afterwards.
 */
export async function indexPlacedBid(
  deps: { chain: Chain; subgraph: SubgraphFake },
  auction: AuctionOnChain,
  receipt: TransactionReceipt,
  bidder: Address,
): Promise<ChainOrder> {
  const orders = ordersIn(receipt, auction, "NewSellOrder");
  expect(orders, "orders the transaction placed in the auction").toHaveLength(1);
  const { timestamp } = await deps.chain.public.getBlock({ blockNumber: receipt.blockNumber });
  await deps.subgraph.overlay(auctionOrder(auction, orders[0], { user: bidder, timestamp }));
  return orders[0];
}

/** The same for a cancellation: the order leaves the fake, as it leaves the real subgraph. */
export async function indexCancelledBid(
  deps: { subgraph: SubgraphFake },
  auction: AuctionOnChain,
  receipt: TransactionReceipt,
): Promise<ChainOrder> {
  const orders = ordersIn(receipt, auction, "CancellationSellOrder");
  expect(orders, "orders the transaction cancelled in the auction").toHaveLength(1);
  const id = subgraphOrderId(auction.id, orders[0]);
  await deps.subgraph.overlay(remove("Order", id), unlink("AuctionDetail", String(auction.id), "orders", [id]));
  return orders[0];
}
