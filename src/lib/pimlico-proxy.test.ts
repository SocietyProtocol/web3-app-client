import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeCreateProfile,
  encodeExecute,
  ERC1967_IMPLEMENTATION_SLOT,
  LIGHT_ACCOUNT_FACTORY,
  LIGHT_ACCOUNT_IMPLEMENTATION,
  LIGHT_ACCOUNT_PROXY_RUNTIME_CODE,
  lightAccountAddress,
} from "@/lib/smart-account";
import { contracts } from "@/consts/contracts";
import { aaRpcHealth, forwardAaRpc, reviewAaRpc, pimlicoRpcUrl } from "@/lib/pimlico-proxy";
import {
  aaRateLimits,
  resetAaRateLimits,
  PAYMASTER_PER_IP_PER_MINUTE,
} from "@/lib/aa/rate-limit";
import { resetSenderCache } from "@/lib/aa/sender-check";
import { MAX_CALL_GAS_LIMIT, MAX_FEE_PER_GAS } from "@/lib/aa/limits";
import { custom, encodeFunctionData, getAddress, pad, toHex } from "viem";
import {
  createPaymasterClient,
  entryPoint06Address,
  entryPoint07Address,
} from "viem/account-abstraction";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { sepolia } from "viem/chains";

const owner = getAddress("0x0000000000000000000000000000000000000001");
const sender = lightAccountAddress(owner);
const SEPOLIA = 11155111;
const PROFILE_URI =
  "https://ipfs.filebase.io/ipfs/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";

const callData = encodeExecute({
  to: contracts.badges.sepolia,
  value: BigInt(0),
  data: encodeCreateProfile(PROFILE_URI),
});

const updateCallData = encodeExecute({
  to: contracts.badges.sepolia,
  value: BigInt(0),
  data: encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "updateProfileURI",
        stateMutability: "nonpayable",
        inputs: [{ type: "uint256" }, { type: "string" }],
        outputs: [],
      },
    ],
    functionName: "updateProfileURI",
    args: [BigInt(1), PROFILE_URI],
  }),
});

const gas = {
  callGasLimit: BigInt(200_000),
  verificationGasLimit: BigInt(150_000),
  preVerificationGas: BigInt(50_000),
  maxFeePerGas: BigInt(20_000_000_000),
  maxPriorityFeePerGas: BigInt(1_000_000_000),
};

/** Captures the exact JSON-RPC request viem / permissionless put on the wire. */
async function captured(
  run: (transport: ReturnType<typeof custom>) => Promise<unknown>,
) {
  let seen: { method: string; params: unknown[] } | undefined;
  const transport = custom({
    async request(args) {
      seen = JSON.parse(JSON.stringify(args));
      return {
        paymaster: "0x0000000000000000000000000000000000000002",
        paymasterData: "0x",
        paymasterVerificationGasLimit: "0x1",
        paymasterPostOpGasLimit: "0x1",
        callGasLimit: "0x1",
        verificationGasLimit: "0x1",
        preVerificationGas: "0x1",
      };
    },
  });
  await run(transport).catch(() => undefined);
  if (!seen) throw new Error("No request captured");
  return seen;
}

function stubDataRequest(overrides: Record<string, unknown> = {}) {
  return captured((transport) =>
    createPaymasterClient({ transport }).getPaymasterStubData({
      chainId: SEPOLIA,
      entryPointAddress: entryPoint07Address,
      context: { sponsorshipPolicyId: "sp_attacker" },
      sender,
      nonce: BigInt(0),
      callData,
      ...gas,
      ...overrides,
    }),
  );
}

function paymasterDataRequest(overrides: Record<string, unknown> = {}) {
  return captured((transport) =>
    createPaymasterClient({ transport }).getPaymasterData({
      chainId: SEPOLIA,
      entryPointAddress: entryPoint07Address,
      context: { sponsorshipPolicyId: "sp_attacker" },
      sender,
      nonce: BigInt(0),
      callData,
      ...gas,
      ...overrides,
    }),
  );
}

describe("reviewAaRpc", () => {
  it("puts the server policy at params[3] for ERC-7677 calls", async () => {
    for (const request of [await stubDataRequest(), await paymasterDataRequest()]) {
      expect(request.params[2]).toBe(toHex(SEPOLIA));
      const reviewed = reviewAaRpc({
        chainId: SEPOLIA,
        policyId: "sp_eager_ricochet",
        request: { jsonrpc: "2.0", id: 7, ...request },
      });
      expect(reviewed.ok, !reviewed.ok ? reviewed.message : "").toBe(true);
      if (!reviewed.ok) return;
      expect(reviewed.body.params).toHaveLength(4);
      expect(reviewed.body.params?.[2]).toBe(toHex(SEPOLIA));
      expect(reviewed.body.params?.[3]).toEqual({ sponsorshipPolicyId: "sp_eager_ricochet" });
      expect(reviewed.review.needsDeployedSender).toBe(true);
    }
  });

  it("replaces attacker context fields, not merges them", async () => {
    const request = await stubDataRequest();
    request.params[3] = { sponsorshipPolicyId: "sp_attacker", token: "0xdead" };
    const reviewed = reviewAaRpc({ chainId: SEPOLIA, policyId: "sp_mine", request });
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.body.params?.[3]).toEqual({ sponsorshipPolicyId: "sp_mine" });
  });

  it("puts the policy at params[2] for pm_sponsorUserOperation", async () => {
    const request = await captured((transport) =>
      createPimlicoClient({
        chain: sepolia,
        transport,
        entryPoint: { address: entryPoint07Address, version: "0.7" },
      }).sponsorUserOperation({
        userOperation: { sender, nonce: BigInt(0), callData, ...gas, signature: "0x" },
        sponsorshipPolicyId: "sp_attacker",
      }),
    );
    expect(request.method).toBe("pm_sponsorUserOperation");
    const reviewed = reviewAaRpc({ chainId: SEPOLIA, policyId: "sp_mine", request });
    expect(reviewed.ok, !reviewed.ok ? reviewed.message : "").toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.body.params).toHaveLength(3);
    expect(reviewed.body.params?.[2]).toEqual({ sponsorshipPolicyId: "sp_mine" });
  });

  it("rejects a wrong or missing chain id slot", async () => {
    const request = await stubDataRequest();
    request.params[2] = toHex(1);
    expect(reviewAaRpc({ chainId: SEPOLIA, request }).ok).toBe(false);
    request.params[2] = { sponsorshipPolicyId: "sp_attacker" };
    expect(reviewAaRpc({ chainId: SEPOLIA, request }).ok).toBe(false);
  });

  it("pins EntryPoint 0.7 and refuses v0.6 fields", async () => {
    const request = await stubDataRequest();
    request.params[1] = entryPoint06Address;
    expect(reviewAaRpc({ chainId: SEPOLIA, request }).ok).toBe(false);

    const send: { method: string; params: unknown[] } = {
      method: "eth_sendUserOperation",
      params: [{ sender, callData }, entryPoint06Address],
    };
    expect(reviewAaRpc({ chainId: SEPOLIA, request: send }).ok).toBe(false);
    send.params[1] = entryPoint07Address;
    expect(reviewAaRpc({ chainId: SEPOLIA, request: send }).ok).toBe(true);

    for (const field of ["initCode", "paymasterAndData"]) {
      const v06 = await stubDataRequest();
      (v06.params[0] as Record<string, unknown>)[field] = "0x";
      expect(reviewAaRpc({ chainId: SEPOLIA, request: v06 })).toMatchObject({
        ok: false,
        message: expect.stringMatching(/EntryPoint 0.7/),
      });
    }
  });

  it("refuses gas and fees above the caps", async () => {
    const overGas = await stubDataRequest({ callGasLimit: MAX_CALL_GAS_LIMIT + BigInt(1) });
    expect(reviewAaRpc({ chainId: SEPOLIA, request: overGas })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/callGasLimit is above/),
    });

    const overFee = await paymasterDataRequest({
      maxFeePerGas: MAX_FEE_PER_GAS[1] + BigInt(1),
      maxPriorityFeePerGas: BigInt(1),
    });
    const onMainnet = {
      ...overFee,
      params: [
        {
          ...(overFee.params[0] as object),
          callData: encodeExecute({
            to: contracts.badges.mainnet,
            value: BigInt(0),
            data: encodeCreateProfile(PROFILE_URI),
          }),
        },
        overFee.params[1],
        toHex(1),
        overFee.params[3],
      ],
    };
    expect(reviewAaRpc({ chainId: 1, request: onMainnet })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/maxFeePerGas is above/),
    });

    const overPostOp = await paymasterDataRequest({
      paymaster: "0x0000000000000000000000000000000000000002",
      paymasterPostOpGasLimit: BigInt(10_000_000),
      paymasterVerificationGasLimit: BigInt(50_000),
    });
    expect(reviewAaRpc({ chainId: SEPOLIA, request: overPostOp })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/paymasterPostOpGasLimit is above/),
    });

    const garbage = await stubDataRequest();
    (garbage.params[0] as Record<string, unknown>).callGasLimit = "lots";
    expect(reviewAaRpc({ chainId: SEPOLIA, request: garbage }).ok).toBe(false);
  });

  it("refuses an oversized profile URI", async () => {
    const request = await stubDataRequest({
      callData: encodeExecute({
        to: contracts.badges.sepolia,
        value: BigInt(0),
        data: encodeCreateProfile(`ipfs://b${"a".repeat(300)}`),
      }),
    });
    expect(reviewAaRpc({ chainId: SEPOLIA, request })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/allowlist/),
    });
  });

  it("flags signing calls that update a profile", async () => {
    const stub = reviewAaRpc({
      chainId: SEPOLIA,
      request: await stubDataRequest({ callData: updateCallData }),
    });
    const data = reviewAaRpc({
      chainId: SEPOLIA,
      request: await paymasterDataRequest({ callData: updateCallData }),
    });
    expect(stub.ok && stub.review.signsProfileUpdate).toBe(false);
    expect(data.ok && data.review.signsProfileUpdate).toBe(true);
  });

  it("rejects other contracts, other chains, and unknown methods", () => {
    const blocked = reviewAaRpc({
      chainId: SEPOLIA,
      request: {
        method: "eth_sendUserOperation",
        params: [
          {
            sender,
            callData: encodeExecute({
              to: contracts.auction.sepolia,
              value: BigInt(0),
              data: "0x1234",
            }),
          },
          entryPoint07Address,
        ],
      },
    });
    expect(blocked.ok).toBe(false);

    expect(reviewAaRpc({ chainId: 8453, request: { method: "eth_chainId" } }).ok).toBe(
      false,
    );
    expect(
      reviewAaRpc({
        chainId: 1,
        request: { method: "eth_getBalance", params: [] },
      }).ok,
    ).toBe(false);
  });

  it("keeps the API key in the upstream URL only", () => {
    const url = new URL(pimlicoRpcUrl(SEPOLIA, "pim_test_key"));
    expect(url.origin + url.pathname).toBe(
      "https://api.pimlico.io/v2/11155111/rpc",
    );
    expect(url.searchParams.get("apikey")).toBe("pim_test_key");
  });
});

type ChainState = { code: string; implementation: string; owner: string };

function mockFetch(chain: ChainState) {
  const upstream: unknown[] = [];
  const chainCalls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body));
    if (url.startsWith("https://api.pimlico.io/")) {
      upstream.push(body);
      return Response.json({ jsonrpc: "2.0", id: body.id, result: { paymasterData: "0x" } });
    }
    chainCalls.push(body.method);
    const result =
      body.method === "eth_getCode"
        ? chain.code
        : body.method === "eth_getStorageAt"
          ? (expect(body.params[1]).toBe(ERC1967_IMPLEMENTATION_SLOT), pad(chain.implementation as `0x${string}`))
          : pad(chain.owner as `0x${string}`);
    return Response.json({ jsonrpc: "2.0", id: body.id, result });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { upstream, chainCalls };
}

const canonical: ChainState = {
  code: LIGHT_ACCOUNT_PROXY_RUNTIME_CODE,
  implementation: LIGHT_ACCOUNT_IMPLEMENTATION,
  owner,
};

function post(body: unknown, ip = "203.0.113.7") {
  return new Request(`http://localhost/api/aa/rpc?chainId=${SEPOLIA}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: JSON.stringify(body),
  });
}

async function rpcError(response: Response) {
  const body = (await response.json()) as { error?: { message: string; code: number } };
  return body.error;
}

describe("forwardAaRpc", () => {
  beforeEach(() => {
    vi.stubEnv("PIMLICO_API_KEY", "pim_test_key");
    vi.stubEnv("PIMLICO_SPONSORSHIP_POLICY_ID", "sp_server");
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "");
    resetAaRateLimits();
    resetSenderCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards a deployed canonical Light Account and caches the check", async () => {
    const { upstream, chainCalls } = mockFetch(canonical);
    const request = await stubDataRequest();
    expect(await rpcError(await forwardAaRpc(post(request)))).toBeUndefined();
    expect(await rpcError(await forwardAaRpc(post(request)))).toBeUndefined();
    expect(chainCalls.sort()).toEqual(["eth_call", "eth_getCode", "eth_getStorageAt"]);
    expect(upstream).toHaveLength(2);
    expect((upstream[0] as { params: unknown[] }).params[3]).toEqual({
      sponsorshipPolicyId: "sp_server",
    });
  });

  it("refuses a foreign sender: other code, other implementation, other owner", async () => {
    const cases: ChainState[] = [
      { ...canonical, code: "0x6080604052" },
      { ...canonical, implementation: "0x000000000000000000000000000000000000dEaD" },
      { ...canonical, owner: "0x0000000000000000000000000000000000000003" },
      { ...canonical, code: "0x" },
    ];
    for (const state of cases) {
      resetSenderCache();
      const { upstream } = mockFetch(state);
      const error = await rpcError(await forwardAaRpc(post(await stubDataRequest())));
      expect(error?.message).toMatch(/sender/);
      expect(upstream).toHaveLength(0);
    }
  });

  it("skips the on-chain check for a canonical first deployment", async () => {
    const { upstream, chainCalls } = mockFetch({ ...canonical, code: "0x" });
    const factoryData = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "createAccount",
          stateMutability: "nonpayable",
          inputs: [{ type: "address" }, { type: "uint256" }],
          outputs: [{ type: "address" }],
        },
      ],
      functionName: "createAccount",
      args: [owner, BigInt(0)],
    });
    const request = await stubDataRequest({ factory: LIGHT_ACCOUNT_FACTORY, factoryData });
    expect(await rpcError(await forwardAaRpc(post(request)))).toBeUndefined();
    expect(chainCalls).toHaveLength(0);
    expect(upstream).toHaveLength(1);
  });

  it("trips the per-sender and per-IP paymaster limits", async () => {
    mockFetch(canonical);
    const request = await stubDataRequest();
    const results = [];
    for (let i = 0; i < 6; i += 1) {
      results.push(await rpcError(await forwardAaRpc(post(request, `198.51.100.${i}`))));
    }
    expect(results.slice(0, 5).every((error) => error === undefined)).toBe(true);
    expect(results[5]?.code).toBe(-32005);

    resetAaRateLimits();
    const otherSenders = Array.from({ length: PAYMASTER_PER_IP_PER_MINUTE + 1 }, () =>
      forwardAaRpc(post({ method: "pm_getPaymasterStubData", params: [] }, "192.0.2.1")),
    );
    // Malformed requests stop at review and do not spend the bucket.
    for (const response of otherSenders) {
      expect((await rpcError(await response))?.code).toBe(-32602);
    }
    for (let i = 0; i < PAYMASTER_PER_IP_PER_MINUTE; i += 1) {
      // The per-sender bucket (5/min) would trip first.
      aaRateLimits.paymasterBySender.reset();
      await forwardAaRpc(post(request, "192.0.2.1"));
    }
    const tripped = await rpcError(await forwardAaRpc(post(request, "192.0.2.1")));
    expect(tripped?.message).toBe("Too many requests");
  });

  it("caps sponsored profile updates per sender per day", async () => {
    mockFetch(canonical);
    const request = await paymasterDataRequest({ callData: updateCallData });
    const errors = [];
    for (let i = 0; i < 11; i += 1) {
      vi.useFakeTimers({ now: Date.now() + i * 60_000 });
      errors.push(await rpcError(await forwardAaRpc(post(request, `198.51.100.${i}`))));
      vi.useRealTimers();
    }
    expect(errors.slice(0, 10).every((error) => error === undefined)).toBe(true);
    expect(errors[10]?.message).toMatch(/Daily/);
  });

  it("refuses when Pimlico is not configured", async () => {
    mockFetch(canonical);
    vi.stubEnv("PIMLICO_API_KEY", "");
    const error = await rpcError(await forwardAaRpc(post(await stubDataRequest())));
    expect(error?.code).toBe(-32603);
  });
});

describe("aaRpcHealth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports configuration and policy without secrets", async () => {
    vi.stubEnv("PIMLICO_API_KEY", "pim_secret_value");
    vi.stubEnv("PIMLICO_SPONSORSHIP_POLICY_ID", "sp_server");
    const body = await aaRpcHealth().json();
    expect(body).toEqual({ configured: true, policy: "sp_server" });
    expect(JSON.stringify(body)).not.toContain("pim_secret_value");
  });
});
