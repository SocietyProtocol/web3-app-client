/**
 * The one free badge: Society pays for a member's first createBadge from
 * their Light Account, once per Society account. Everything after that is
 * paid by the owner wallet, as before.
 *
 * Off unless SPONSOR_FIRST_BADGE is exactly "true" on the server. When it is
 * off, the proxy refuses a createBadge paymaster call exactly as before and
 * GET /api/aa/first-badge answers { enabled: false }.
 *
 * There is no database. Whether a sender has used its free badge is read
 * from the subgraph and the chain each time:
 *   1. the subgraph: badges whose creatorAddress is the sender, not profiles
 *      and not community badges, as of the subgraph's _meta block B;
 *   2. the chain, for what the subgraph has not indexed yet: BadgeCreated
 *      logs of the badges contract with creator = sender, from block B to
 *      block X (the node's head when the check started), minus the sender's
 *      profile badge (createProfile emits BadgeCreated too);
 *   3. for a paymaster call, the UserOp's nonce must be the sender's current
 *      EntryPoint nonce at block X, on key 0. Every free-badge sponsorship
 *      handed out before the first one lands then shares one nonce, so at
 *      most one of them can ever execute; once it has, the nonce has moved
 *      on and step 2 sees its BadgeCreated at the same block.
 * Anything that cannot be read (subgraph down, node down, the subgraph more
 * than MAX_UNINDEXED_BLOCKS behind) answers "not eligible": the owner pays,
 * exactly as without the feature. The proxy also keeps its in-memory rate
 * limits (lib/aa/rate-limit.ts), including a daily cap of free-badge
 * signatures per visitor and sender.
 */
import {
  Address,
  Hex,
  decodeFunctionResult,
  encodeEventTopics,
  encodeFunctionData,
  getAddress,
  hexToBigInt,
  isAddress,
  isHex,
  toHex,
} from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { e2eRequestSwitch } from "@/lib/e2e-overrides";
import { PERSISTED_GRAPH_DOCUMENTS } from "@/lib/persisted-graphql.generated";
import { getGraphGatewayEnv } from "@/lib/server-env";
import { serverRpc } from "@/lib/aa/sender-check";
import {
  ENTRY_POINT_V07,
  badgesAddress,
  supportedAaChainId,
} from "@/lib/smart-account";

/** Name of the server variable that turns the free badge on. */
export const SPONSOR_FIRST_BADGE_ENV = "SPONSOR_FIRST_BADGE";
/** Cookie the hermetic browser tests set to turn it on for one test. */
export const E2E_SPONSOR_FIRST_BADGE_COOKIE = "e2e-sponsor-first-badge";

/**
 * How far the subgraph may be behind the node before the check gives up.
 * The gap is read with eth_getLogs in chunks of LOG_CHUNK_BLOCKS (Alchemy
 * limits the range of one call on smaller plans).
 */
export const MAX_UNINDEXED_BLOCKS = 1_500;
const LOG_CHUNK_BLOCKS = 500;
const GRAPH_TIMEOUT_MS = 8_000;
const MAX_CACHED_SENDERS = 10_000;

export const FIRST_BADGE_REASONS = {
  disabled: "The free first badge is not enabled",
  used: "This account has already created a badge",
  unchecked: "Could not check this account's badges",
  behind: "Badge history is still syncing",
  nonce: "User operation nonce is not the account's next nonce",
} as const;

export type FirstBadgeReason = keyof typeof FIRST_BADGE_REASONS;

export type FirstBadgeEligibility =
  | { eligible: true; blockNumber: bigint }
  | { eligible: false; reason: FirstBadgeReason };

/** Whether the free badge is on for this request. */
export function sponsorFirstBadgeEnabled(request?: Request): boolean {
  if (process.env[SPONSOR_FIRST_BADGE_ENV] === "true") return true;
  return !!request && e2eRequestSwitch(request, E2E_SPONSOR_FIRST_BADGE_COOKIE);
}

export type FirstBadgeReads = {
  rpc: (chainId: number, method: string, params: unknown[]) => Promise<unknown>;
  graph: (operationName: string, variables: Record<string, unknown>) => Promise<unknown>;
};

/** Persisted queries straight to the protected query gateway (server only). */
async function gatewayQuery(
  operationName: string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  const query = PERSISTED_GRAPH_DOCUMENTS.get(operationName);
  if (!query) throw new Error(`Unknown persisted query ${operationName}`);
  const { graphQueryGatewayUrl, graphQueryGatewayToken } = getGraphGatewayEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GRAPH_TIMEOUT_MS);
  try {
    const response = await fetch(graphQueryGatewayUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${graphQueryGatewayToken}`,
      },
      body: JSON.stringify({ query, operationName, variables }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Graph gateway error");
    const body = (await response.json()) as { data?: unknown; errors?: unknown };
    if (body.errors || !body.data) throw new Error("Graph query failed");
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

const defaultReads: FirstBadgeReads = { rpc: serverRpc, graph: gatewayQuery };

/**
 * Senders known to have created a badge. Only "used" is cached: it never
 * goes back. "Eligible" is read again every time.
 */
const used = new Set<string>();

export function resetFirstBadgeCache() {
  used.clear();
}

function quantity(value: unknown): bigint {
  if (typeof value !== "string" || !isHex(value)) throw new Error("Not a quantity");
  return hexToBigInt(value);
}

const getNonceAbi = [
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [
      { name: "sender", type: "address" },
      { name: "key", type: "uint192" },
    ],
    outputs: [{ name: "nonce", type: "uint256" }],
  },
] as const;

async function subgraphHasBadge(reads: FirstBadgeReads, sender: Address) {
  // _meta first: the badges query then answers as of B or later, so the
  // chain is read from B and nothing falls between the two.
  const status = (await reads.graph("Status", {})) as {
    _meta?: { block?: { number?: unknown } };
  };
  const indexed = status?._meta?.block?.number;
  if (typeof indexed !== "number" && typeof indexed !== "string") {
    throw new Error("Subgraph has no _meta block");
  }
  const block = BigInt(indexed);
  const data = (await reads.graph("Badges", {
    first: 1,
    skip: 0,
    orderBy: "createdAt",
    orderDirection: "asc",
    where: {
      creatorAddress: sender.toLowerCase(),
      isProfile: false,
      isCommunity: false,
    },
  })) as { badges?: unknown[] };
  if (!Array.isArray(data?.badges)) throw new Error("Subgraph answered without badges");
  return { block, hasBadge: data.badges.length > 0 };
}

async function chainHasBadge(
  reads: FirstBadgeReads,
  chainId: number,
  badges: Address,
  sender: Address,
  from: bigint,
  to: bigint,
) {
  if (from > to) return false;
  const topics = encodeEventTopics({
    abi: SocietyProtocolBadgesABI,
    eventName: "BadgeCreated",
    args: { creator: sender },
  });
  const ids: bigint[] = [];
  for (let start = from; start <= to; start += BigInt(LOG_CHUNK_BLOCKS)) {
    const end = start + BigInt(LOG_CHUNK_BLOCKS - 1) < to ? start + BigInt(LOG_CHUNK_BLOCKS - 1) : to;
    const logs = await reads.rpc(chainId, "eth_getLogs", [
      { address: badges, topics, fromBlock: toHex(start), toBlock: toHex(end) },
    ]);
    if (!Array.isArray(logs)) throw new Error("eth_getLogs answered without logs");
    for (const log of logs as { topics?: unknown[] }[]) {
      const idTopic = log?.topics?.[1];
      ids.push(quantity(idTopic));
    }
  }
  if (ids.length === 0) return false;
  // createProfile emits BadgeCreated with the sender as creator: not a badge
  // the member made.
  const profile = await reads.rpc(chainId, "eth_call", [
    {
      to: badges,
      data: encodeFunctionData({
        abi: SocietyProtocolBadgesABI,
        functionName: "profileBadgeId",
        args: [sender],
      }),
    },
    toHex(to),
  ]);
  const profileId = decodeFunctionResult({
    abi: SocietyProtocolBadgesABI,
    functionName: "profileBadgeId",
    data: profile as Hex,
  }) as bigint;
  return ids.some((id) => id !== profileId);
}

/**
 * Whether sender has not created a badge yet. With userOpNonce (a paymaster
 * call), also whether that nonce is the sender's next one at the block read.
 */
export async function firstBadgeEligibility(
  input: { chainId: number; sender: unknown; userOpNonce?: unknown },
  reads: FirstBadgeReads = defaultReads,
): Promise<FirstBadgeEligibility> {
  const badges = badgesAddress(input.chainId);
  if (!supportedAaChainId(input.chainId) || !badges) {
    return { eligible: false, reason: "unchecked" };
  }
  if (typeof input.sender !== "string" || !isAddress(input.sender)) {
    return { eligible: false, reason: "unchecked" };
  }
  const sender = getAddress(input.sender);
  const key = `${input.chainId}:${sender.toLowerCase()}`;
  if (used.has(key)) return { eligible: false, reason: "used" };

  let nonce: bigint | undefined;
  if (input.userOpNonce !== undefined) {
    try {
      nonce = quantity(input.userOpNonce);
    } catch {
      return { eligible: false, reason: "nonce" };
    }
    // Key 0 only: other keys would let several free badges run side by side.
    if (nonce >> BigInt(64) !== BigInt(0)) return { eligible: false, reason: "nonce" };
  }

  try {
    const [head, indexed] = await Promise.all([
      reads.rpc(input.chainId, "eth_blockNumber", []).then(quantity),
      subgraphHasBadge(reads, sender),
    ]);
    if (indexed.hasBadge) {
      remember(key);
      return { eligible: false, reason: "used" };
    }
    if (head > indexed.block && head - indexed.block > BigInt(MAX_UNINDEXED_BLOCKS)) {
      return { eligible: false, reason: "behind" };
    }

    const [created, current] = await Promise.all([
      chainHasBadge(reads, input.chainId, badges, sender, indexed.block, head),
      nonce === undefined
        ? Promise.resolve(undefined)
        : reads
            .rpc(input.chainId, "eth_call", [
              {
                to: ENTRY_POINT_V07,
                data: encodeFunctionData({
                  abi: getNonceAbi,
                  functionName: "getNonce",
                  args: [sender, BigInt(0)],
                }),
              },
              toHex(head),
            ])
            .then(quantity),
    ]);
    if (created) {
      remember(key);
      return { eligible: false, reason: "used" };
    }
    if (nonce !== undefined && current !== nonce) {
      return { eligible: false, reason: "nonce" };
    }
    return { eligible: true, blockNumber: head };
  } catch {
    return { eligible: false, reason: "unchecked" };
  }
}

function remember(key: string) {
  if (used.size >= MAX_CACHED_SENDERS) used.clear();
  used.add(key);
}
