import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Address,
  Hex,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  pad,
  toHex,
  zeroAddress,
} from "viem";
import { createPaymasterClient, entryPoint07Address } from "viem/account-abstraction";
import { custom } from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import {
  DEFAULT_FIRST_BADGE_MIN_PROFILE_AGE_HOURS,
  FIRST_BADGE_REASONS,
  FirstBadgeReads,
  MAX_UNINDEXED_BLOCKS,
  firstBadgeEligibility,
  firstBadgeMinProfileAgeSeconds,
  resetFirstBadgeCache,
  sponsorFirstBadgeEnabled,
} from "@/lib/aa/first-badge";
import { firstBadgeStatus } from "@/lib/aa/first-badge-status";
import {
  DEFAULT_FIRST_BADGE_DAILY_CAP,
  FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY,
  RollingWindowCap,
  aaRateLimits,
  firstBadgeDailyCap,
  resetAaRateLimits,
} from "@/lib/aa/rate-limit";
import { resetSenderCache } from "@/lib/aa/sender-check";
import {
  FIRST_BADGE_DAILY_CAP_MESSAGE,
  forwardAaRpc,
  reviewAaRpc,
} from "@/lib/pimlico-proxy";
import {
  ENTRY_POINT_V07,
  LIGHT_ACCOUNT_FACTORY,
  LIGHT_ACCOUNT_IMPLEMENTATION,
  LIGHT_ACCOUNT_PROXY_RUNTIME_CODE,
  encodeCreateAccount,
  encodeCreateProfile,
  encodeExecute,
  encodeExecuteBatch,
  isFreeBadgeShape,
  isSponsoredBadgesCall,
  lightAccountAddress,
  userOperationIsFreeBadge,
  userOperationIsSponsored,
} from "@/lib/smart-account";
import { callShape } from "@/lib/outpost-routing";
import { fetchFirstBadgeStatus } from "@/lib/first-badge-client";

const SEPOLIA = 11155111;
const BADGES = contracts.badges.sepolia;
const owner = getAddress("0x0000000000000000000000000000000000000001");
const sender = lightAccountAddress(owner);
/** The member's profile badge, on the chain and in the subgraph. */
const PROFILE_ID = BigInt(42);
const HOUR = 3600;
const DAY = 24 * HOUR;
const URI =
  "https://ipfs.filebase.io/ipfs/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";

type CreateBadgeArgs = {
  name?: string;
  isOfficial?: boolean;
  isCommunityBadge?: boolean;
  hook?: Address;
  uri?: string;
  minters?: bigint[];
  editors?: Address[];
};

function createBadge(args: CreateBadgeArgs = {}): Hex {
  return encodeFunctionData({
    abi: SocietyProtocolBadgesABI,
    functionName: "createBadge",
    args: [
      args.name ?? "My first badge",
      args.isOfficial ?? false,
      args.isCommunityBadge ?? false,
      args.hook ?? zeroAddress,
      args.uri ?? "",
      args.minters ?? [],
      [],
      [],
      args.editors ?? [],
    ],
  });
}

const call = (data: Hex, to: Address = BADGES) => ({ to, value: BigInt(0), data });

describe("free badge shape", () => {
  it("accepts what the badge wizard sends, with or without metadata", () => {
    expect(isFreeBadgeShape(call(createBadge()), SEPOLIA)).toBe(true);
    expect(isFreeBadgeShape(call(createBadge({ uri: URI, minters: [BigInt(1)] })), SEPOLIA)).toBe(true);
  });

  it("refuses official, community, hooked, foreign-URI, oversized and misaddressed badges", () => {
    const refused: Hex[] = [
      createBadge({ isOfficial: true }),
      createBadge({ isCommunityBadge: true }),
      createBadge({ hook: "0x000000000000000000000000000000000000dEaD" }),
      createBadge({ uri: "https://evil.example/badge.json" }),
      createBadge({ name: "x".repeat(101) }),
      createBadge({ name: "   " }),
      createBadge({ minters: Array.from({ length: 21 }, (_, i) => BigInt(i + 1)) }),
      createBadge({ editors: Array.from({ length: 21 }, () => owner) }),
      encodeCreateProfile(URI),
    ];
    for (const data of refused) expect(isFreeBadgeShape(call(data), SEPOLIA)).toBe(false);
    expect(isFreeBadgeShape(call(createBadge(), contracts.communityRegistry.sepolia), SEPOLIA)).toBe(false);
    expect(isFreeBadgeShape({ ...call(createBadge()), value: BigInt(1) }, SEPOLIA)).toBe(false);
    expect(isFreeBadgeShape(call(createBadge(), contracts.badges.mainnet), SEPOLIA)).toBe(false);
  });

  it("is sponsored only when the caller says the account still has its free badge", () => {
    const args = { chainId: SEPOLIA, to: BADGES, data: createBadge() };
    expect(isSponsoredBadgesCall(args)).toBe(false);
    expect(isSponsoredBadgesCall(args, { firstBadge: true })).toBe(true);
    expect(callShape({ chainId: SEPOLIA, to: BADGES, data: createBadge() })).toEqual({
      relayable: true,
      sponsored: false,
    });
    expect(callShape({ chainId: SEPOLIA, to: BADGES, data: createBadge(), firstBadge: true })).toEqual({
      relayable: true,
      sponsored: true,
    });
  });

  it("passes the UserOp allowlist only alone and only with the switch on", () => {
    const single = { sender, callData: encodeExecute(call(createBadge())) };
    expect(userOperationIsSponsored(single, SEPOLIA).ok).toBe(false);
    expect(userOperationIsSponsored(single, SEPOLIA, { firstBadge: true }).ok).toBe(true);
    expect(userOperationIsFreeBadge(single, SEPOLIA)).toBe(true);

    const two = { sender, callData: encodeExecuteBatch([call(createBadge()), call(createBadge())]) };
    expect(userOperationIsSponsored(two, SEPOLIA, { firstBadge: true }).ok).toBe(false);
    expect(userOperationIsFreeBadge(two, SEPOLIA)).toBe(false);

    const withProfile = {
      sender,
      callData: encodeExecuteBatch([call(encodeCreateProfile(URI)), call(createBadge())]),
    };
    expect(userOperationIsSponsored(withProfile, SEPOLIA, { firstBadge: true }).ok).toBe(false);
  });

  it("never covers a UserOp that deploys its sender", () => {
    const deploying = {
      sender,
      callData: encodeExecute(call(createBadge())),
      factory: LIGHT_ACCOUNT_FACTORY,
      factoryData: encodeCreateAccount(owner),
    };
    expect(userOperationIsFreeBadge(deploying, SEPOLIA)).toBe(false);
    expect(userOperationIsSponsored(deploying, SEPOLIA, { firstBadge: true })).toEqual({
      ok: false,
      reason: "User operation is outside the sponsorship allowlist",
    });
    // The same deployment with a profile is still sponsored as before.
    const profile = { ...deploying, callData: encodeExecute(call(encodeCreateProfile(URI))) };
    expect(userOperationIsSponsored(profile, SEPOLIA, { firstBadge: true }).ok).toBe(true);
  });
});

/** The fakes' wall clock (unix seconds). */
const NOW = 1_800_000_000;

/** A chain and a subgraph in memory, answering the reads first-badge makes. */
function fakeReads(state: {
  head?: bigint;
  indexed?: bigint;
  subgraphBadges?: number;
  /** Ids of BadgeCreated logs with the sender as creator, by block. */
  logs?: { block: bigint; id: bigint }[];
  /** profileBadgeId(sender) on chain; 0 is no profile. Default PROFILE_ID. */
  profileId?: bigint;
  /** When the subgraph says the profile badge was made (unix seconds). Default: a week ago. */
  profileCreatedAt?: number;
  /** The id the subgraph lists for the profile badge. Default: profileId. */
  subgraphProfileId?: bigint;
  nonce?: bigint;
  failGraph?: boolean;
  failRpc?: string;
}) {
  const profileId = state.profileId ?? PROFILE_ID;
  const profileCreatedAt = state.profileCreatedAt ?? NOW - 7 * DAY;
  const calls: { method: string; params: unknown[] }[] = [];
  const graphCalls: { operationName: string; variables: Record<string, unknown> }[] = [];
  const reads: FirstBadgeReads = {
    async rpc(_chainId, method, params) {
      calls.push({ method, params });
      if (state.failRpc === method) throw new Error("RPC error");
      if (method === "eth_blockNumber") return toHex(state.head ?? BigInt(1000));
      if (method === "eth_getLogs") {
        const filter = params[0] as { fromBlock: Hex; toBlock: Hex; topics: Hex[] };
        expect(filter.topics[2]).toBe(pad(sender.toLowerCase() as Hex));
        const from = BigInt(filter.fromBlock);
        const to = BigInt(filter.toBlock);
        return (state.logs ?? [])
          .filter((log) => log.block >= from && log.block <= to)
          .map((log) => ({ topics: [filter.topics[0], pad(toHex(log.id)), filter.topics[2]] }));
      }
      if (method === "eth_call") {
        const tx = params[0] as { to: Address; data: Hex };
        if (tx.to.toLowerCase() === ENTRY_POINT_V07.toLowerCase()) {
          return encodeAbiParameters([{ type: "uint256" }], [state.nonce ?? BigInt(0)]);
        }
        const decoded = decodeFunctionData({ abi: SocietyProtocolBadgesABI, data: tx.data });
        expect(decoded.functionName).toBe("profileBadgeId");
        return encodeAbiParameters([{ type: "uint256" }], [profileId]);
      }
      throw new Error(`unexpected ${method}`);
    },
    async graph(operationName, variables) {
      graphCalls.push({ operationName, variables });
      if (state.failGraph) throw new Error("Graph down");
      if (operationName === "Status") {
        return { _meta: { block: { number: Number(state.indexed ?? BigInt(990)) } } };
      }
      const where = variables.where as { isProfile: boolean; createdAt_lte?: string };
      if (where.isProfile) {
        const listed = profileId !== BigInt(0) && profileCreatedAt <= Number(where.createdAt_lte);
        return { badges: listed ? [{ id: String(state.subgraphProfileId ?? profileId) }] : [] };
      }
      return { badges: Array.from({ length: state.subgraphBadges ?? 0 }, (_, i) => ({ id: String(i) })) };
    },
    now: () => NOW * 1000,
  };
  return { reads, calls, graphCalls };
}

describe("firstBadgeEligibility", () => {
  beforeEach(() => resetFirstBadgeCache());

  it("is eligible with no badge in the subgraph or in the unindexed blocks", async () => {
    const { reads, calls, graphCalls } = fakeReads({});
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, reads)).toEqual({
      eligible: true,
      blockNumber: BigInt(1000),
    });
    const wheres = graphCalls.map((c) => c.variables.where).filter(Boolean);
    expect(wheres).toHaveLength(2);
    expect(wheres).toEqual(
      expect.arrayContaining([
        { creatorAddress: sender.toLowerCase(), isProfile: false, isCommunity: false },
        {
          creatorAddress: sender.toLowerCase(),
          isProfile: true,
          createdAt_lte: String(NOW - DEFAULT_FIRST_BADGE_MIN_PROFILE_AGE_HOURS * HOUR),
        },
      ]),
    );
    // The profile is read on chain at the block the check is pinned to.
    const profileRead = calls.find(
      (c) => c.method === "eth_call" && (c.params[0] as { to: Address }).to === BADGES,
    );
    expect(profileRead?.params[1]).toBe(toHex(BigInt(1000)));
    // From the subgraph's block to the node's head, both included.
    const ranges = calls
      .filter((c) => c.method === "eth_getLogs")
      .map((c) => c.params[0] as Record<string, Hex>)
      .map((filter) => [Number(BigInt(filter.fromBlock)), Number(BigInt(filter.toBlock))]);
    expect(ranges).toEqual([
      [990, 999],
      [1000, 1000],
    ]);
  });

  it("is used once the subgraph lists a badge, and remembers it", async () => {
    const first = fakeReads({ subgraphBadges: 1 });
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, first.reads)).toEqual({
      eligible: false,
      reason: "used",
    });
    const second = fakeReads({});
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, second.reads)).eligible).toBe(false);
    expect(second.calls).toHaveLength(0);
  });

  it("sees a badge the subgraph has not indexed yet", async () => {
    const { reads } = fakeReads({ indexed: BigInt(990), logs: [{ block: BigInt(995), id: BigInt(77) }] });
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, reads)).toEqual({
      eligible: false,
      reason: "used",
    });
  });

  it("does not count the profile badge createProfile emits", async () => {
    const { reads } = fakeReads({
      logs: [{ block: BigInt(995), id: PROFILE_ID }],
      profileId: PROFILE_ID,
    });
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, reads)).eligible).toBe(true);
  });

  it("reads a long gap in chunks and gives up when the subgraph is too far behind", async () => {
    const chunked = fakeReads({ head: BigInt(1000), indexed: BigInt(975) });
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, chunked.reads)).eligible).toBe(true);
    const ranges = chunked.calls
      .filter((c) => c.method === "eth_getLogs")
      .map((c) => (c.params[0] as Record<string, Hex>))
      .map((filter) => [Number(BigInt(filter.fromBlock)), Number(BigInt(filter.toBlock))]);
    expect(ranges).toEqual([
      [975, 984],
      [985, 994],
      [995, 1000],
    ]);

    const behind = fakeReads({ head: BigInt(10_000), indexed: BigInt(10_000 - MAX_UNINDEXED_BLOCKS - 1) });
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, behind.reads)).toEqual({
      eligible: false,
      reason: "behind",
    });
  });

  it("skips the chain logs when the subgraph is ahead of the node", async () => {
    const { reads, calls } = fakeReads({ head: BigInt(1000), indexed: BigInt(1005) });
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, reads)).eligible).toBe(true);
    expect(calls.filter((c) => c.method === "eth_getLogs")).toHaveLength(0);
  });

  it("answers not eligible when anything cannot be read, without remembering it", async () => {
    for (const state of [{ failGraph: true }, { failRpc: "eth_getLogs" }, { failRpc: "eth_blockNumber" }]) {
      const { reads } = fakeReads(state);
      expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, reads)).toEqual({
        eligible: false,
        reason: "unchecked",
      });
    }
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, fakeReads({}).reads)).eligible).toBe(true);
  });

  it("pins the UserOp to the account's next nonce on key 0", async () => {
    const at = (nonce: bigint) => fakeReads({ nonce }).reads;
    expect(
      (await firstBadgeEligibility({ chainId: SEPOLIA, sender, userOpNonce: toHex(BigInt(3)) }, at(BigInt(3)))).eligible,
    ).toBe(true);
    expect(
      await firstBadgeEligibility({ chainId: SEPOLIA, sender, userOpNonce: toHex(BigInt(3)) }, at(BigInt(4))),
    ).toEqual({ eligible: false, reason: "nonce" });
    const otherKey = toHex((BigInt(1) << BigInt(64)) | BigInt(3));
    expect(
      await firstBadgeEligibility({ chainId: SEPOLIA, sender, userOpNonce: otherKey }, at(BigInt(3))),
    ).toEqual({ eligible: false, reason: "nonce" });
    expect(
      await firstBadgeEligibility({ chainId: SEPOLIA, sender, userOpNonce: "missing" }, at(BigInt(0))),
    ).toEqual({ eligible: false, reason: "nonce" });
  });

  it("requires a profile on chain", async () => {
    const { reads } = fakeReads({ profileId: BigInt(0) });
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, reads)).toEqual({
      eligible: false,
      reason: "noProfile",
    });
  });

  it("requires the profile to be older than the minimum age", async () => {
    const minAge = DEFAULT_FIRST_BADGE_MIN_PROFILE_AGE_HOURS * HOUR;
    const fresh = fakeReads({ profileCreatedAt: NOW - minAge + 60 });
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, fresh.reads)).toEqual({
      eligible: false,
      reason: "profileTooNew",
    });
    const justOldEnough = fakeReads({ profileCreatedAt: NOW - minAge });
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, justOldEnough.reads)).eligible).toBe(true);
    // An old profile badge in the subgraph that is not the one on chain does not count.
    const other = fakeReads({ subgraphProfileId: BigInt(7) });
    expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, other.reads)).toEqual({
      eligible: false,
      reason: "profileTooNew",
    });
  });

  it("reads the minimum age from the environment, and 0 still requires a profile", async () => {
    try {
      vi.stubEnv("FIRST_BADGE_MIN_PROFILE_AGE_HOURS", "");
      expect(firstBadgeMinProfileAgeSeconds()).toBe(DEFAULT_FIRST_BADGE_MIN_PROFILE_AGE_HOURS * HOUR);
      vi.stubEnv("FIRST_BADGE_MIN_PROFILE_AGE_HOURS", "-1");
      expect(firstBadgeMinProfileAgeSeconds()).toBe(DEFAULT_FIRST_BADGE_MIN_PROFILE_AGE_HOURS * HOUR);
      vi.stubEnv("FIRST_BADGE_MIN_PROFILE_AGE_HOURS", "soon");
      expect(firstBadgeMinProfileAgeSeconds()).toBe(DEFAULT_FIRST_BADGE_MIN_PROFILE_AGE_HOURS * HOUR);
      vi.stubEnv("FIRST_BADGE_MIN_PROFILE_AGE_HOURS", "48");
      expect(firstBadgeMinProfileAgeSeconds()).toBe(48 * HOUR);
      const twoDays = fakeReads({ profileCreatedAt: NOW - DAY });
      expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, twoDays.reads)).eligible).toBe(false);

      vi.stubEnv("FIRST_BADGE_MIN_PROFILE_AGE_HOURS", "0");
      const justMade = fakeReads({ profileCreatedAt: NOW });
      expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender }, justMade.reads)).eligible).toBe(true);
      expect(justMade.graphCalls.filter((c) => (c.variables.where as { isProfile?: boolean })?.isProfile)).toHaveLength(0);
      const none = fakeReads({ profileId: BigInt(0) });
      expect(await firstBadgeEligibility({ chainId: SEPOLIA, sender }, none.reads)).toEqual({
        eligible: false,
        reason: "noProfile",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("refuses unsupported chains and malformed senders", async () => {
    const { reads } = fakeReads({});
    expect((await firstBadgeEligibility({ chainId: 10, sender }, reads)).eligible).toBe(false);
    expect((await firstBadgeEligibility({ chainId: SEPOLIA, sender: "0x12" }, reads)).eligible).toBe(false);
  });
});

describe("the SPONSOR_FIRST_BADGE switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off unless the variable is exactly true", () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "");
    expect(sponsorFirstBadgeEnabled()).toBe(false);
    vi.stubEnv("SPONSOR_FIRST_BADGE", "1");
    expect(sponsorFirstBadgeEnabled()).toBe(false);
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    expect(sponsorFirstBadgeEnabled()).toBe(true);
  });

  it("ignores the test cookie outside the suite's build", () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "");
    vi.stubEnv("E2E_HERMETIC", "1");
    const request = new Request("http://localhost/", { headers: { cookie: "e2e-sponsor-first-badge=1" } });
    expect(sponsorFirstBadgeEnabled(request)).toBe(false);
  });

  it("leaves createBadge paymaster calls refused when off", async () => {
    const request = await paymasterRequest("pm_getPaymasterStubData", createBadge());
    const off = reviewAaRpc({ chainId: SEPOLIA, request });
    expect(off.ok).toBe(false);
    const on = reviewAaRpc({ chainId: SEPOLIA, request, sponsorFirstBadge: true });
    expect(on.ok && on.review.freeBadge).toBe(true);
    expect(on.ok && on.review.signsFreeBadge).toBe(false);
    expect(on.ok && on.review.nonce).toBe("0x5");
  });
});

const gas = {
  callGasLimit: BigInt(200_000),
  verificationGasLimit: BigInt(150_000),
  preVerificationGas: BigInt(50_000),
  maxFeePerGas: BigInt(20_000_000_000),
  maxPriorityFeePerGas: BigInt(1_000_000_000),
};

/** The JSON-RPC request viem's paymaster client puts on the wire. */
async function paymasterRequest(
  method: "pm_getPaymasterStubData" | "pm_getPaymasterData",
  data: Hex,
  nonce = BigInt(5),
) {
  let seen: unknown;
  const transport = custom({
    async request(args) {
      seen = JSON.parse(JSON.stringify(args));
      return { paymaster: zeroAddress, paymasterData: "0x" };
    },
  });
  const client = createPaymasterClient({ transport });
  const parameters = {
    chainId: SEPOLIA,
    entryPointAddress: entryPoint07Address,
    sender,
    nonce,
    callData: encodeExecute(call(data)),
    ...gas,
  };
  await (method === "pm_getPaymasterStubData"
    ? client.getPaymasterStubData(parameters)
    : client.getPaymasterData(parameters)
  ).catch(() => undefined);
  return { ...(seen as object), jsonrpc: "2.0", id: 1 };
}

const GATEWAY = "https://graph.example.test/graphql";

/** fetch for the proxy: Pimlico, the graph gateway and the server's node. */
function mockServices(
  state: {
    subgraphBadges?: number;
    nonce?: bigint;
    logs?: bigint[];
    /** profileBadgeId(sender); 0 is no profile. Default PROFILE_ID. */
    profileId?: bigint;
    /** Seconds since the subgraph's profile badge was made. Default: a week. */
    profileAge?: number;
  } = {},
) {
  const profileId = state.profileId ?? PROFILE_ID;
  const profileCreatedAt = Math.floor(Date.now() / 1000) - (state.profileAge ?? 7 * DAY);
  const upstream: { method: string }[] = [];
  const graph: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body));
      if (url.startsWith("https://api.pimlico.io/")) {
        upstream.push(body);
        return Response.json({ jsonrpc: "2.0", id: body.id, result: { paymasterData: "0x" } });
      }
      if (url === GATEWAY) {
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer gateway-token");
        graph.push(body.operationName);
        if (body.operationName === "Status") {
          return Response.json({ data: { _meta: { block: { number: 100 } } } });
        }
        if (body.variables.where.isProfile) {
          const listed =
            profileId !== BigInt(0) && profileCreatedAt <= Number(body.variables.where.createdAt_lte);
          return Response.json({ data: { badges: listed ? [{ id: String(profileId) }] : [] } });
        }
        return Response.json({
          data: { badges: Array.from({ length: state.subgraphBadges ?? 0 }, () => ({ id: "1" })) },
        });
      }
      const word = (value: bigint) => encodeAbiParameters([{ type: "uint256" }], [value]);
      const result = (() => {
        switch (body.method) {
          case "eth_getCode":
            return LIGHT_ACCOUNT_PROXY_RUNTIME_CODE;
          case "eth_getStorageAt":
            return pad(LIGHT_ACCOUNT_IMPLEMENTATION);
          case "eth_blockNumber":
            return toHex(BigInt(101));
          case "eth_getLogs":
            return (state.logs ?? []).map((id) => ({ topics: ["0x", pad(toHex(id))] }));
          case "eth_call": {
            const to = String(body.params[0].to).toLowerCase();
            if (to === sender.toLowerCase()) return pad(owner);
            if (to === ENTRY_POINT_V07.toLowerCase()) return word(state.nonce ?? BigInt(5));
            expect(to).toBe(BADGES.toLowerCase());
            return word(profileId);
          }
          default:
            throw new Error(`unexpected ${body.method}`);
        }
      })();
      return Response.json({ jsonrpc: "2.0", id: body.id, result });
    }),
  );
  return { upstream, graph };
}

function post(body: unknown, options: { ip?: string; cookie?: string } = {}) {
  return new Request(`http://localhost/api/aa/rpc?chainId=${SEPOLIA}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": options.ip ?? "203.0.113.9",
      ...(options.cookie && { cookie: options.cookie }),
    },
    body: JSON.stringify(body),
  });
}

async function rpcError(response: Response) {
  const body = (await response.json()) as { error?: { message: string; code: number } };
  return body.error;
}

describe("forwardAaRpc with the free first badge", () => {
  beforeEach(() => {
    vi.stubEnv("PIMLICO_API_KEY", "pim_test_key");
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "");
    vi.stubEnv("GRAPH_QUERY_GATEWAY_URL", GATEWAY);
    vi.stubEnv("GRAPH_QUERY_GATEWAY_TOKEN", "gateway-token");
    resetAaRateLimits();
    resetSenderCache();
    resetFirstBadgeCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("refuses createBadge as before when the switch is off", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "false");
    const { upstream, graph } = mockServices({});
    const error = await rpcError(await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterData", createBadge()))));
    expect(error?.message).toBe("User operation is outside the sponsorship allowlist");
    expect(upstream).toHaveLength(0);
    expect(graph).toHaveLength(0);
  });

  it("sponsors the first badge of an account that has none", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    const { upstream, graph } = mockServices({});
    for (const method of ["pm_getPaymasterStubData", "pm_getPaymasterData"] as const) {
      expect(await rpcError(await forwardAaRpc(post(await paymasterRequest(method, createBadge()))))).toBeUndefined();
    }
    expect(upstream.map((body) => body.method)).toEqual(["pm_getPaymasterStubData", "pm_getPaymasterData"]);
    // Per call: Status, the member's badges, and its profile's age.
    expect([...graph].sort()).toEqual(["Badges", "Badges", "Badges", "Badges", "Status", "Status"]);
  });

  it("refuses an account that has created a badge, by the subgraph or by the chain", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    for (const state of [{ subgraphBadges: 1 }, { logs: [BigInt(9)] }]) {
      resetFirstBadgeCache();
      const { upstream } = mockServices(state);
      const error = await rpcError(await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterData", createBadge()))));
      expect(error).toEqual({ code: -32602, message: FIRST_BADGE_REASONS.used });
      expect(upstream).toHaveLength(0);
    }
  });

  it("refuses a UserOp that is not at the account's next nonce", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    const { upstream } = mockServices({ nonce: BigInt(6) });
    const error = await rpcError(await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterData", createBadge()))));
    expect(error?.message).toBe(FIRST_BADGE_REASONS.nonce);
    expect(upstream).toHaveLength(0);
  });

  it("caps free badge signatures per visitor and sender per day", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    mockServices({});
    const request = await paymasterRequest("pm_getPaymasterData", createBadge());
    const errors = [];
    for (let i = 0; i <= FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY; i += 1) {
      errors.push(await rpcError(await forwardAaRpc(post(request, { ip: "198.51.100.1" }))));
    }
    expect(errors.slice(0, FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY)).toEqual(
      Array(FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY).fill(undefined),
    );
    expect(errors.at(-1)).toEqual({ code: -32005, message: "Daily free badge sponsorship limit reached" });
  });

  it("refuses a free badge for an account without a profile, or with one made just now", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    for (const [state, reason] of [
      [{ profileId: BigInt(0) }, FIRST_BADGE_REASONS.noProfile],
      [{ profileAge: HOUR }, FIRST_BADGE_REASONS.profileTooNew],
    ] as const) {
      const { upstream } = mockServices(state);
      for (const method of ["pm_getPaymasterStubData", "pm_getPaymasterData"] as const) {
        const error = await rpcError(await forwardAaRpc(post(await paymasterRequest(method, createBadge()))));
        expect(error).toEqual({ code: -32602, message: reason });
      }
      expect(upstream).toHaveLength(0);
    }
  });

  it("refuses a free badge in a UserOp that deploys the account", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    const { upstream } = mockServices({});
    const request = (await paymasterRequest("pm_getPaymasterData", createBadge())) as unknown as {
      params: [Record<string, unknown>];
    };
    request.params[0].factory = LIGHT_ACCOUNT_FACTORY;
    request.params[0].factoryData = encodeCreateAccount(owner);
    expect(await rpcError(await forwardAaRpc(post(request)))).toEqual({
      code: -32602,
      message: "User operation is outside the sponsorship allowlist",
    });
    expect(upstream).toHaveLength(0);
  });

  it("gives out at most FIRST_BADGE_DAILY_CAP free badges a day across all visitors", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "2");
    const { upstream } = mockServices({});
    const signing = await paymasterRequest("pm_getPaymasterData", createBadge());
    // Our sender is the second of the day; asking again (a declined wallet
    // prompt, another visitor) does not count it twice.
    expect(aaRateLimits.firstBadgesPerDay.take(`${SEPOLIA}:0xearlier`, 2)).toBe(true);
    expect(await rpcError(await forwardAaRpc(post(signing, { ip: "198.51.100.2" })))).toBeUndefined();
    expect(await rpcError(await forwardAaRpc(post(signing, { ip: "198.51.100.3" })))).toBeUndefined();
    expect(upstream).toHaveLength(2);

    // The day's two are taken: a third account is refused, stub call first.
    resetAaRateLimits();
    expect(aaRateLimits.firstBadgesPerDay.take(`${SEPOLIA}:0xone`, 2)).toBe(true);
    expect(aaRateLimits.firstBadgesPerDay.take(`${SEPOLIA}:0xtwo`, 2)).toBe(true);
    for (const method of ["pm_getPaymasterStubData", "pm_getPaymasterData"] as const) {
      const error = await rpcError(await forwardAaRpc(post(await paymasterRequest(method, createBadge()))));
      expect(error).toEqual({ code: -32005, message: FIRST_BADGE_DAILY_CAP_MESSAGE });
    }
    expect(upstream).toHaveLength(2);
  });

  it("does not spend the daily cap on stub calls or on refused accounts", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "1");
    mockServices({ profileAge: HOUR });
    await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterData", createBadge())));
    mockServices({});
    await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterStubData", createBadge())));
    expect(aaRateLimits.firstBadgesPerDay.wouldAdmit(`${SEPOLIA}:0xsomeone-else`, 1)).toBe(true);
  });

  it("sends free badges to PIMLICO_FIRST_BADGE_POLICY_ID when it is set, and nothing else", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    vi.stubEnv("PIMLICO_SPONSORSHIP_POLICY_ID", "sp_main");
    vi.stubEnv("PIMLICO_FIRST_BADGE_POLICY_ID", "sp_free_badge");
    const { upstream } = mockServices({});
    for (const method of ["pm_getPaymasterStubData", "pm_getPaymasterData"] as const) {
      await forwardAaRpc(post(await paymasterRequest(method, createBadge())));
    }
    await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterStubData", encodeCreateProfile(URI))));
    const policies = (upstream as unknown as { params: { sponsorshipPolicyId?: string }[] }[]).map(
      (body) => body.params[3]?.sponsorshipPolicyId,
    );
    expect(policies).toEqual(["sp_free_badge", "sp_free_badge", "sp_main"]);
  });

  it("still refuses an official badge or a batch of two badges with the switch on", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    const { upstream } = mockServices({});
    const official = await paymasterRequest("pm_getPaymasterData", createBadge({ isOfficial: true }));
    expect((await rpcError(await forwardAaRpc(post(official))))?.message).toBe(
      "User operation is outside the sponsorship allowlist",
    );
    const batch = (await paymasterRequest("pm_getPaymasterData", createBadge())) as unknown as {
      params: [{ callData: Hex }];
    };
    batch.params[0].callData = encodeExecuteBatch([call(createBadge()), call(createBadge())]);
    expect((await rpcError(await forwardAaRpc(post(batch))))?.message).toBe(
      "User operation is outside the sponsorship allowlist",
    );
    expect(upstream).toHaveLength(0);
  });
});

describe("GET /api/aa/first-badge", () => {
  const get = (query: string) => new Request(`http://localhost/api/aa/first-badge?${query}`);

  beforeEach(() => {
    resetAaRateLimits();
    resetFirstBadgeCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("says disabled without reading anything when the switch is off", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "");
    const { reads, calls } = fakeReads({});
    const response = await firstBadgeStatus(get(`chainId=${SEPOLIA}&sender=${sender}`), reads);
    expect(await response.json()).toEqual({ enabled: false, eligible: false, reason: "disabled" });
    expect(calls).toHaveLength(0);
  });

  it("answers eligible or used when on", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    const eligible = await firstBadgeStatus(get(`chainId=${SEPOLIA}&sender=${sender}`), fakeReads({}).reads);
    expect(await eligible.json()).toEqual({ enabled: true, eligible: true });
    const used = await firstBadgeStatus(
      get(`chainId=${SEPOLIA}&sender=${sender}`),
      fakeReads({ subgraphBadges: 1 }).reads,
    );
    expect(await used.json()).toEqual({ enabled: true, eligible: false, reason: "used" });
  });

  it("says ineligible exactly when the proxy would refuse, so the wizard shows the wallet paying", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    vi.stubEnv("PIMLICO_API_KEY", "pim_test_key");
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "");
    vi.stubEnv("GRAPH_QUERY_GATEWAY_URL", GATEWAY);
    vi.stubEnv("GRAPH_QUERY_GATEWAY_TOKEN", "gateway-token");
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "1");
    const cases = [
      { name: "eligible", state: {}, reason: undefined },
      { name: "no profile", state: { profileId: BigInt(0) }, reason: "noProfile" },
      { name: "new profile", state: { profileAge: HOUR }, reason: "profileTooNew" },
      { name: "used", state: { subgraphBadges: 1 }, reason: "used" },
      { name: "capped", state: {}, reason: "capped", fill: true },
    ] as const;
    try {
      for (const testCase of cases) {
        resetAaRateLimits();
        resetSenderCache();
        resetFirstBadgeCache();
        if ("fill" in testCase) aaRateLimits.firstBadgesPerDay.take(`${SEPOLIA}:0xother`, 1);
        mockServices(testCase.state);
        const status = await (await firstBadgeStatus(get(`chainId=${SEPOLIA}&sender=${sender}`))).json();
        const routed = callShape({
          chainId: SEPOLIA,
          to: BADGES,
          data: createBadge(),
          firstBadge: status.eligible,
        });
        const proxyError = await rpcError(
          await forwardAaRpc(post(await paymasterRequest("pm_getPaymasterData", createBadge()))),
        );
        expect({ case: testCase.name, status, sponsored: routed.sponsored, refused: !!proxyError }).toEqual({
          case: testCase.name,
          status: testCase.reason
            ? { enabled: true, eligible: false, reason: testCase.reason }
            : { enabled: true, eligible: true },
          sponsored: !testCase.reason,
          refused: !!testCase.reason,
        });
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects a bad chain or sender", async () => {
    vi.stubEnv("SPONSOR_FIRST_BADGE", "true");
    expect((await firstBadgeStatus(get(`chainId=10&sender=${sender}`))).status).toBe(400);
    expect((await firstBadgeStatus(get(`chainId=${SEPOLIA}&sender=nope`))).status).toBe(400);
  });
});

describe("fetchFirstBadgeStatus", () => {
  it("treats any failure as not eligible", async () => {
    const failing = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await fetchFirstBadgeStatus(SEPOLIA, sender, failing)).toEqual({ enabled: false, eligible: false });
    const server500 = vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    expect(await fetchFirstBadgeStatus(SEPOLIA, sender, server500)).toEqual({ enabled: false, eligible: false });
    const ok = vi.fn(async () => Response.json({ enabled: true, eligible: true })) as unknown as typeof fetch;
    expect(await fetchFirstBadgeStatus(SEPOLIA, sender, ok)).toEqual({ enabled: true, eligible: true });
  });
});

describe("the app-wide daily cap", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads FIRST_BADGE_DAILY_CAP, falling back to the default", () => {
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "");
    expect(firstBadgeDailyCap()).toBe(DEFAULT_FIRST_BADGE_DAILY_CAP);
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "2.5");
    expect(firstBadgeDailyCap()).toBe(DEFAULT_FIRST_BADGE_DAILY_CAP);
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "-3");
    expect(firstBadgeDailyCap()).toBe(DEFAULT_FIRST_BADGE_DAILY_CAP);
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "0");
    expect(firstBadgeDailyCap()).toBe(0);
    vi.stubEnv("FIRST_BADGE_DAILY_CAP", "5");
    expect(firstBadgeDailyCap()).toBe(5);
  });

  it("admits at most cap distinct keys per rolling window, each counted once", () => {
    const cap = new RollingWindowCap(DAY * 1000);
    const t0 = 1_000_000;
    expect(cap.take("a", 2, t0)).toBe(true);
    expect(cap.take("a", 2, t0 + 1)).toBe(true);
    expect(cap.take("b", 2, t0 + 2)).toBe(true);
    expect(cap.wouldAdmit("c", 2, t0 + 3)).toBe(false);
    expect(cap.take("c", 2, t0 + 3)).toBe(false);
    expect(cap.take("b", 2, t0 + 4)).toBe(true);
    // A day after "a" was admitted its slot is free again; "b"'s is not yet.
    expect(cap.take("c", 2, t0 + DAY * 1000)).toBe(true);
    expect(cap.take("d", 2, t0 + DAY * 1000)).toBe(false);
    expect(cap.take("x", 0, t0)).toBe(false);
  });
});
