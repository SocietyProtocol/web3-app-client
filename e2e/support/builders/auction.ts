import {
  encodeFunctionData,
  isAddressEqual,
  maxUint256,
  parseAbi,
  parseEventLogs,
  zeroAddress,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { EasyAuctionAbi } from "../../../src/abis/EasyAuction";
import { contracts } from "../../../src/consts/contracts";
import { tokens } from "../../../src/consts/tokens";
import { encodeOrderId } from "../../../src/utils/auction";
import { AUCTION_ID } from "../../env/hermetic";
import type { Chain } from "../chain/chain";
import {
  approveAs,
  approveCall,
  decimalString,
  tokenBalance,
  tokenInfo,
  type TokenInfo,
} from "./auction-tokens";
import { link, upsert, type OverlayOp } from "./entities";

/**
 * The SPEC auction on the local fork, and its entities in the subgraph fake.
 *
 * Two things have to agree before a bid can be tested:
 *
 *   the id compiled into the app   NEXT_PUBLIC_AUCTION_ID is a build-time
 *                                  value. The suite's build takes it from
 *                                  `auction.id` in e2e/env/hermetic.json
 *                                  (null as committed: see AUCTION_ID).
 *   the auction on chain           ensureAuction() makes sure an OPEN
 *                                  auction with that id exists in the
 *                                  EasyAuction contract of the fork, and
 *                                  creates it when the id is the next one.
 *
 * What the page shows about the auction (prices, dates, the orders) comes
 * from the subgraph, and the fake does not follow the EasyAuction contract.
 * auctionDetail() and auctionOrder() build those entities from what is on
 * chain, so a test plays the indexer with real data instead of made-up
 * rows; the dates and totals a scenario is about are passed as overrides.
 */

/**
 * The auction id the suite's app build was compiled with, or undefined when
 * the build has none (the page then says "Coming soon": scenario M1).
 *
 * `auction.id` in e2e/env/hermetic.json, which the launcher also passes to
 * the build as NEXT_PUBLIC_AUCTION_ID (e2e/support/stack/config.mjs). It is
 * null as committed, so this is undefined and every test that needs an
 * auction skips itself until someone sets it.
 */
export { AUCTION_ID };

export const EASY_AUCTION_ADDRESS: Address = contracts.auction.sepolia;
export const SPEC_TOKEN_ADDRESS: Address = tokens.spec.sepolia;
/**
 * Circle's USDC on Sepolia: the bidding token of an auction this file
 * creates. The page has an icon for it (public/tokens/usdc.svg).
 */
export const BIDDING_TOKEN_ADDRESS: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

/**
 * The parts of Gnosis' EasyAuction the app's own ABI (src/abis/EasyAuction)
 * leaves out. Written from the published contract; the deployment on
 * Sepolia has not been checked against it.
 */
const easyAuctionAbi = parseAbi([
  "function auctionCounter() view returns (uint256)",
  "function auctionData(uint256 auctionId) view returns (address auctioningToken, address biddingToken, uint256 orderCancellationEndDate, uint256 auctionEndDate, bytes32 initialAuctionOrder, uint256 minimumBiddingAmountPerOrder, uint256 interimSumBidAmount, bytes32 interimOrder, bytes32 clearingPriceOrder, uint96 volumeClearingPriceOrder, bool minFundingThresholdNotReached, bool isAtomicClosureAllowed, uint256 feeNumerator, uint256 minFundingThreshold)",
  "function initiateAuction(address _auctioningToken, address _biddingToken, uint256 orderCancellationEndDate, uint256 auctionEndDate, uint96 _auctionedSellAmount, uint96 _minBuyAmount, uint256 minimumBiddingAmountPerOrder, uint256 minFundingThreshold, bool isAtomicClosureAllowed, address accessManagerContract, bytes accessManagerContractData) returns (uint256)",
  "function containsOrder(uint256 auctionId, bytes32 order) view returns (bool)",
  "event NewSellOrder(uint256 indexed auctionId, uint64 indexed userId, uint96 buyAmount, uint96 sellAmount)",
  "event CancellationSellOrder(uint256 indexed auctionId, uint64 indexed userId, uint96 buyAmount, uint96 sellAmount)",
]);

/** The hint the app passes for where an order goes in the contract's list: the queue's start. */
const QUEUE_START: Hex = "0x0000000000000000000000000000000000000000000000000000000000000001";

/** An order as the contract stores it: who (its user id), and the two amounts. */
export type ChainOrder = { userId: bigint; buyAmount: bigint; sellAmount: bigint };

export type AuctionOnChain = {
  id: bigint;
  auctioningToken: TokenInfo;
  biddingToken: TokenInfo;
  orderCancellationEndDate: bigint;
  auctionEndDate: bigint;
  /** The auctioneer's own order: `sellAmount` of the auctioned token for at least `buyAmount` of the bidding token. */
  initialOrder: ChainOrder;
  /** A bid must be larger than this, in the bidding token's units ("Minimum bid amount"). */
  minBid: bigint;
  /** A bid's price must be higher than this, in bidding-token units per whole auctioned token ("Minimum price"). */
  minPrice: bigint;
};

const YEAR = BigInt(365 * 24 * 60 * 60);
/** An auction of this file stays open, and cancellable, this long: longer than any time travel of the suite. */
const OPEN_FOR = BigInt(20) * YEAR;
/** How many auctions ensureAuction() will create to reach the configured id. */
const MAX_NEW_AUCTIONS = BigInt(10);

function decodeOrder(order: Hex): ChainOrder {
  const digits = order.slice(2).padStart(64, "0");
  return {
    userId: BigInt(`0x${digits.slice(0, 16)}`),
    buyAmount: BigInt(`0x${digits.slice(16, 40)}`),
    sellAmount: BigInt(`0x${digits.slice(40, 64)}`),
  };
}

async function chainNow(chain: Chain): Promise<bigint> {
  return (await chain.public.getBlock()).timestamp;
}

/** The auction as the EasyAuction contract has it. */
export async function readAuction(chain: Chain, id: bigint): Promise<AuctionOnChain> {
  const data = await chain.public.readContract({
    address: EASY_AUCTION_ADDRESS,
    abi: easyAuctionAbi,
    functionName: "auctionData",
    args: [id],
  });
  const [auctioningTokenAddress, biddingTokenAddress, orderCancellationEndDate, auctionEndDate, initial, minBid] = data;
  if (isAddressEqual(auctioningTokenAddress, zeroAddress)) {
    throw new Error(`The EasyAuction contract on the fork has no auction ${id}`);
  }
  const [auctioningToken, biddingToken] = await Promise.all([
    tokenInfo(chain, auctioningTokenAddress),
    tokenInfo(chain, biddingTokenAddress),
  ]);
  const initialOrder = decodeOrder(initial);
  return {
    id,
    auctioningToken,
    biddingToken,
    orderCancellationEndDate,
    auctionEndDate,
    initialOrder,
    minBid,
    // The app's formula (AuctionContext): the auctioneer's price per whole token.
    minPrice: (initialOrder.buyAmount * BigInt(10) ** BigInt(auctioningToken.decimals)) / initialOrder.sellAmount,
  };
}

/** Starts one auction as the funded test key: 100,000 SPEC for at least 50,000 of the bidding token, bids above 10. */
async function initiateAuction(chain: Chain): Promise<void> {
  const [spec, bidding] = await Promise.all([
    tokenInfo(chain, SPEC_TOKEN_ADDRESS),
    tokenInfo(chain, BIDDING_TOKEN_ADDRESS),
  ]);
  const auctioned = BigInt(100_000) * BigInt(10) ** BigInt(spec.decimals);
  const minBuy = BigInt(50_000) * BigInt(10) ** BigInt(bidding.decimals);
  const minBid = BigInt(10) * BigInt(10) ** BigInt(bidding.decimals);
  const end = (await chainNow(chain)) + OPEN_FOR;

  // The contract takes the auctioned amount plus its fee from the auctioneer.
  await chain.setErc20Balance(spec.address, chain.funder.address, auctioned * BigInt(2));
  await chain.sendFromFunder({ to: spec.address, data: approveCall(EASY_AUCTION_ADDRESS, maxUint256) });
  await chain.sendFromFunder({
    to: EASY_AUCTION_ADDRESS,
    data: encodeFunctionData({
      abi: easyAuctionAbi,
      functionName: "initiateAuction",
      args: [spec.address, bidding.address, end, end, auctioned, minBuy, minBid, BigInt(0), false, zeroAddress, "0x"],
    }),
  });
}

/**
 * The open auction with the id the app was built with, created on the fork
 * if it is not there yet. Returns what the contract holds about it.
 *
 * The id must be an auction that is still open on the fork, or lie at most
 * ten above the contract's counter at the fork block (the auctions in
 * between are created too). An auction that has already ended cannot be
 * used: choose the counter plus one for `auction.id`.
 */
export async function ensureAuction(chain: Chain, id: number | undefined = AUCTION_ID): Promise<AuctionOnChain> {
  if (id === undefined) {
    throw new Error(
      "No auction id is configured: set `auction.id` in e2e/env/hermetic.json (the stack then rebuilds the app with it)",
    );
  }
  const target = BigInt(id);
  const counter = () =>
    chain.public.readContract({ address: EASY_AUCTION_ADDRESS, abi: easyAuctionAbi, functionName: "auctionCounter" });

  let current = await counter();
  if (target > current + MAX_NEW_AUCTIONS) {
    throw new Error(
      `Auction ${target} is configured, but the EasyAuction contract on the fork has only ${current} auctions. ` +
        `Set auction.id in e2e/env/hermetic.json to ${current + BigInt(1)}.`,
    );
  }
  while (current < target) {
    await initiateAuction(chain);
    const next = await counter();
    if (next !== current + BigInt(1)) {
      throw new Error(`initiateAuction moved the auction counter from ${current} to ${next}`);
    }
    current = next;
  }

  const auction = await readAuction(chain, target);
  const now = await chainNow(chain);
  if (auction.auctionEndDate <= now || auction.orderCancellationEndDate <= now) {
    throw new Error(
      `Auction ${target} on the fork is over (it ended at ${auction.auctionEndDate}, cancelling at ` +
        `${auction.orderCancellationEndDate}; the chain is at ${now}). Set auction.id in e2e/env/hermetic.json ` +
        `to ${current + BigInt(1)}, and start a new stack.`,
    );
  }
  return auction;
}

// ---- orders on chain --------------------------------------------------------

/** The id the subgraph gives an order, which the app turns back into the contract's (src/utils/auction.ts). */
export function subgraphOrderId(auctionId: bigint, order: ChainOrder): string {
  return `${auctionId}-${order.sellAmount}-${order.buyAmount}-${order.userId}`;
}

/** What a bid of `sellAmount` at `price` asks for at least, in the auctioned token: the app's own formula. */
export function buyAmountFor(auction: AuctionOnChain, sellAmount: bigint, price: bigint): bigint {
  return (sellAmount * BigInt(10) ** BigInt(auction.auctioningToken.decimals)) / price;
}

/** placeSellOrders(auction, [buyAmount], [sellAmount], [queue start], "0x"): the call "Place Bid" makes. */
export function placeOrderCall(auction: AuctionOnChain, order: { buyAmount: bigint; sellAmount: bigint }): Hex {
  return encodeFunctionData({
    abi: EasyAuctionAbi,
    functionName: "placeSellOrders",
    args: [auction.id, [order.buyAmount], [order.sellAmount], [QUEUE_START], "0x"],
  });
}

/** cancelSellOrders(auction, [order]): the call "Cancel" makes. */
export function cancelOrderCall(auction: AuctionOnChain, order: ChainOrder): Hex {
  return encodeFunctionData({
    abi: EasyAuctionAbi,
    functionName: "cancelSellOrders",
    args: [auction.id, [encodeOrderId(order.userId, order.buyAmount, order.sellAmount)]],
  });
}

/** The orders of this auction a transaction placed ("NewSellOrder") or cancelled ("CancellationSellOrder"). */
export function ordersIn(
  receipt: TransactionReceipt,
  auction: AuctionOnChain,
  eventName: "NewSellOrder" | "CancellationSellOrder",
): ChainOrder[] {
  return parseEventLogs({
    abi: easyAuctionAbi,
    eventName,
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, EASY_AUCTION_ADDRESS)),
  })
    .filter((log) => log.args.auctionId === auction.id)
    .map((log) => ({ userId: log.args.userId, buyAmount: log.args.buyAmount, sellAmount: log.args.sellAmount }));
}

/** Whether the contract still has the order in the auction's order book. */
export function orderExists(chain: Chain, auction: AuctionOnChain, order: ChainOrder): Promise<boolean> {
  return chain.public.readContract({
    address: EASY_AUCTION_ADDRESS,
    abi: easyAuctionAbi,
    functionName: "containsOrder",
    args: [auction.id, encodeOrderId(order.userId, order.buyAmount, order.sellAmount)],
  });
}

/**
 * Places a bid as `bidder` (impersonated), the way the wallet would have
 * done earlier: gives it the bidding tokens, approves the contract and
 * places the order. Returns the order as the contract recorded it, and the
 * block time it was placed at.
 */
export async function placeOrderAs(
  chain: Chain,
  auction: AuctionOnChain,
  bidder: Address,
  bid: { sellAmount: bigint; price: bigint },
): Promise<{ order: ChainOrder; timestamp: bigint }> {
  const token = auction.biddingToken.address;
  const held = await tokenBalance(chain, token, bidder);
  await chain.setErc20Balance(token, bidder, held + bid.sellAmount);
  await approveAs(chain, token, bidder, EASY_AUCTION_ADDRESS, bid.sellAmount);
  const receipt = await chain.sendAs(bidder, {
    to: EASY_AUCTION_ADDRESS,
    data: placeOrderCall(auction, {
      sellAmount: bid.sellAmount,
      buyAmount: buyAmountFor(auction, bid.sellAmount, bid.price),
    }),
  });
  const [order] = ordersIn(receipt, auction, "NewSellOrder");
  if (!order) throw new Error("Seeding failed: placeSellOrders emitted no NewSellOrder for this auction");
  const { timestamp } = await chain.public.getBlock({ blockNumber: receipt.blockNumber });
  return { order, timestamp };
}

// ---- the auction in the subgraph fake ---------------------------------------

/** Fields of the subgraph's AuctionDetail a test may set. BigInt and BigDecimal values are decimal strings. */
export type AuctionDetailFields = {
  startingTimeStamp: string;
  endTimeTimestamp: string;
  orderCancellationEndDate: string;
  /** In bidding-token units per whole auctioned token, e.g. "0.75". */
  currentClearingPrice: string;
  /** Sum of the bids so far, in the bidding token's smallest unit. */
  currentBiddingAmount: string;
  currentVolume: string;
  symbolAuctioningToken: string;
  symbolBiddingToken: string;
};

const auctionUserId = (userId: bigint) => String(userId);

function orderEntity(
  auction: AuctionOnChain,
  order: ChainOrder,
  options: { user?: Address; timestamp: bigint | number },
): OverlayOp[] {
  const user = options.user?.toLowerCase() ?? null;
  // Price in bidding tokens per auctioned token, both in whole tokens.
  const price = decimalString(
    order.sellAmount * BigInt(10) ** BigInt(auction.auctioningToken.decimals),
    order.buyAmount * BigInt(10) ** BigInt(auction.biddingToken.decimals),
  );
  return [
    upsert("AuctionUser", auctionUserId(order.userId), { address: user ?? zeroAddress, user }),
    upsert("Order", subgraphOrderId(auction.id, order), {
      auctionId: String(auction.id),
      auctionUser: auctionUserId(order.userId),
      buyAmount: String(order.buyAmount),
      sellAmount: String(order.sellAmount),
      userAddress: user ?? zeroAddress,
      price,
      volume: decimalString(order.sellAmount, BigInt(10) ** BigInt(auction.biddingToken.decimals)),
      timestamp: String(options.timestamp),
    }),
  ];
}

/**
 * The auction as the subgraph would report it, from what the contract
 * holds. Without overrides it is running: it started a day ago, and ends
 * and stops accepting cancellations when the contract says. Pass other
 * dates for the scenarios about an auction that has not started, has ended,
 * or can no longer be cancelled; those change only what the page shows.
 */
export function auctionDetail(auction: AuctionOnChain, fields: Partial<AuctionDetailFields> = {}): OverlayOp[] {
  const id = String(auction.id);
  const now = Math.floor(Date.now() / 1000);
  // The auctioneer sells the auctioned token, so its order reads the other
  // way round: the page's "exactOrder" has the auctioned amount as
  // sellAmount and the least it must raise as buyAmount.
  const initialId = subgraphOrderId(auction.id, auction.initialOrder);
  return [
    upsert("AuctionUser", auctionUserId(auction.initialOrder.userId), { address: zeroAddress, user: null }),
    upsert("Order", initialId, {
      auctionId: id,
      auctionUser: auctionUserId(auction.initialOrder.userId),
      buyAmount: String(auction.initialOrder.buyAmount),
      sellAmount: String(auction.initialOrder.sellAmount),
      userAddress: zeroAddress,
      price: decimalString(auction.minPrice, BigInt(10) ** BigInt(auction.biddingToken.decimals)),
      volume: "0",
      timestamp: String(now - 86_400),
    }),
    upsert("AuctionDetail", id, {
      auctionId: id,
      chainId: "11155111",
      symbolAuctioningToken: auction.auctioningToken.symbol,
      symbolBiddingToken: auction.biddingToken.symbol,
      addressAuctioningToken: auction.auctioningToken.address.toLowerCase(),
      addressBiddingToken: auction.biddingToken.address.toLowerCase(),
      decimalsAuctioningToken: String(auction.auctioningToken.decimals),
      decimalsBiddingToken: String(auction.biddingToken.decimals),
      startingTimeStamp: String(now - 86_400),
      endTimeTimestamp: String(auction.auctionEndDate),
      orderCancellationEndDate: String(auction.orderCancellationEndDate),
      minimumBiddingAmountPerOrder: String(auction.minBid),
      minFundingThreshold: "0",
      allowListManager: zeroAddress,
      allowListSigner: zeroAddress,
      currentVolume: "0",
      currentClearingOrderSellAmount: String(auction.initialOrder.sellAmount),
      currentClearingOrderBuyAmount: String(auction.initialOrder.buyAmount),
      currentClearingPrice: decimalString(auction.minPrice, BigInt(10) ** BigInt(auction.biddingToken.decimals)),
      currentBiddingAmount: "0",
      isAtomicClosureAllowed: false,
      isPrivateAuction: false,
      interestScore: "0",
      usdAmountTraded: "0",
      exactOrder: initialId,
      orders: [initialId],
      ...fields,
    }),
  ];
}

/**
 * A bid as the subgraph would index it: the order, its bidder, and its
 * place in the auction's list of orders. `user` is the bidder's WALLET (the
 * page asks for the orders of `useAccount().address`). Build it from an
 * order that is on chain (ordersIn() or placeOrderAs()), so that "Cancel"
 * has something to cancel.
 */
export function auctionOrder(
  auction: AuctionOnChain,
  order: ChainOrder,
  options: { user: Address; timestamp: bigint | number },
): OverlayOp[] {
  return [
    ...orderEntity(auction, order, options),
    link("AuctionDetail", String(auction.id), "orders", [subgraphOrderId(auction.id, order)]),
  ];
}
