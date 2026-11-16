import { encodeFunctionData, isAddress, isAddressEqual, toHex, type Address, type Hex } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import {
  LIGHT_ACCOUNT_FACTORY,
  encodeCreateAccount,
  encodeCreateProfile,
  encodeExecute,
} from "../../../src/lib/smart-account";
import {
  PAYMASTER_PER_IP_PER_MINUTE,
  PAYMASTER_PER_SENDER_PER_MINUTE,
} from "../../../src/lib/aa/rate-limit";
import { BADGES_ADDRESS, CHAIN_ID, ENTRY_POINT_ADDRESS, IPFS_GATEWAY } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { REFUSALS } from "../../support/aa/refusals";
import { paymasterStubCall, unsignedUserOperation } from "../../support/aa/requests";

/**
 * /api/aa/rpc: the proxy in front of the bundler and paymaster. These tests
 * call the route the way the browser does. Here the upstream is the local
 * mock paymaster and alto; the proxy code is the production code.
 */
const RPC = `/api/aa/rpc?chainId=${CHAIN_ID}`;
const A_PINNED_URI = `${IPFS_GATEWAY}/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku`;

type JsonRpcReply = { result?: unknown; error?: { code: number; message: string } };

/** A first user operation of a new account, as viem sends it for the paymaster stub call. */
function firstUserOperation(owner: Address, sender: Address, callData: Hex) {
  return {
    sender,
    nonce: "0x0",
    factory: LIGHT_ACCOUNT_FACTORY,
    factoryData: encodeCreateAccount(owner),
    callData,
    callGasLimit: "0x0",
    verificationGasLimit: "0x0",
    preVerificationGas: "0x0",
    maxFeePerGas: toHex(BigInt(2_000_000_000)),
    maxPriorityFeePerGas: toHex(BigInt(1_000_000_000)),
    signature: "0x",
  };
}

test.describe("/api/aa/rpc", () => {
  test("P3: GET reports that the proxy is configured, and nothing secret", { tag: ["@smoke"] }, async ({ api }) => {
    const response = await api.get("/api/aa/rpc");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ configured: true, policy: "sp_eager_ricochet" });
  });

  test("P3: a read method is forwarded and answered by the bundler", { tag: ["@smoke"] }, async ({ api }) => {
    const response = await api.post(RPC, {
      data: { jsonrpc: "2.0", id: 7, method: "eth_supportedEntryPoints", params: [] },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as JsonRpcReply;
    expect(body.error).toBeUndefined();
    const entryPoints = body.result as Address[];
    expect(entryPoints.some((address) => isAddressEqual(address, ENTRY_POINT_ADDRESS))).toBe(true);
  });

  test("P3: refuses a method that is not on the allowlist", { tag: ["@core"] }, async ({ api }) => {
    const response = await api.post(RPC, {
      data: { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [BADGES_ADDRESS, "latest"] },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32602, message: "Method is not available on this proxy" },
    });
  });

  test("P3: refuses a chain the app does not serve", { tag: ["@core"] }, async ({ api }) => {
    const response = await api.post("/api/aa/rpc?chainId=5", {
      data: { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
    });
    const body = (await response.json()) as JsonRpcReply;
    expect(body.error).toEqual({ code: -32602, message: "Unsupported chain" });
  });

  test("P3: refuses EntryPoint 0.6 user operations", { tag: ["@core"] }, async ({ api, nextAccount, chain }) => {
    const owner = nextAccount().address;
    const response = await api.post(RPC, {
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_estimateUserOperationGas",
        params: [
          { sender: chain.societyAddress(owner), nonce: "0x0", initCode: "0x", callData: "0x", paymasterAndData: "0x" },
          ENTRY_POINT_ADDRESS,
        ],
      },
    });
    const body = (await response.json()) as JsonRpcReply;
    expect(body.error?.message).toBe("Only EntryPoint 0.7 user operations are accepted");
  });

  test(
    "P3: sponsors createProfile from a new canonical Light Account, and refuses a mint",
    { tag: ["@core", "@sponsored"] },
    async ({ api, nextAccount, chain }) => {
      const owner = nextAccount().address;
      const sender = chain.societyAddress(owner);
      const stub = (callData: Hex) =>
        api.post(RPC, {
          data: {
            jsonrpc: "2.0",
            id: 1,
            method: "pm_getPaymasterStubData",
            params: [firstUserOperation(owner, sender, callData), ENTRY_POINT_ADDRESS, toHex(CHAIN_ID), {}],
          },
        });

      const profile = encodeExecute({
        to: BADGES_ADDRESS,
        value: BigInt(0),
        data: encodeCreateProfile(A_PINNED_URI),
      });
      const granted = (await (await stub(profile)).json()) as JsonRpcReply;
      expect(granted.error).toBeUndefined();
      const paymaster = (granted.result as { paymaster?: string }).paymaster;
      expect(paymaster && isAddress(paymaster), "the stub names a paymaster contract").toBe(true);
      expect(await chain.isContract(paymaster as Address)).toBe(true);

      const mint = encodeExecute({
        to: BADGES_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: SocietyProtocolBadgesABI,
          functionName: "mint",
          args: [owner, BigInt(69), BigInt(1), "0x"],
        }),
      });
      const refused = (await (await stub(mint)).json()) as JsonRpcReply;
      expect(refused.result).toBeUndefined();
      expect(refused.error).toEqual({
        code: -32602,
        message: "User operation is outside the sponsorship allowlist",
      });

      // A sender that is not the owner's canonical address is refused too.
      const stranger = chain.societyAddress(nextAccount().address);
      const wrongSender = await api.post(RPC, {
        data: {
          jsonrpc: "2.0",
          id: 1,
          method: "pm_getPaymasterStubData",
          params: [firstUserOperation(owner, stranger, profile), ENTRY_POINT_ADDRESS, toHex(CHAIN_ID), {}],
        },
      });
      expect(((await wrongSender.json()) as JsonRpcReply).error?.message).toBe(
        "User operation sender does not match the owner",
      );
    },
  );

  test(
    "P7: the proxy sponsors five paymaster calls a minute per sender and ten per visitor, and says which limit was hit",
    { tag: ["@core", "@sponsored"] },
    async ({ api, nextAccount, chain }) => {
      const profile = encodeExecute({
        to: BADGES_ADDRESS,
        value: BigInt(0),
        data: encodeCreateProfile(A_PINNED_URI),
      });
      // A request for sponsorship of a new account's first profile, as the
      // app makes it. One send makes two of them.
      const ask = async (owner: Address) => {
        const response = await api.post(RPC, {
          data: paymasterStubCall(unsignedUserOperation({ owner, sender: chain.societyAddress(owner), callData: profile })),
        });
        expect(response.status()).toBe(200);
        return (await response.json()) as JsonRpcReply & { jsonrpc?: string; id?: unknown };
      };
      const started = Date.now();
      // The buckets refill while the test runs: one token per 12 s for a
      // sender, one per 6 s for a visitor.
      const refilled = (perMinute: number) => Math.ceil(((Date.now() - started) / 60_000) * perMinute);
      let fromThisVisitor = 0;

      // One sender: the calls of two sends and the first of a third go
      // through; then the proxy refuses, with the sender's limit.
      const sender = nextAccount().address;
      let granted = 0;
      let reply = await ask(sender);
      while (!reply.error) {
        granted += 1;
        fromThisVisitor += 1;
        expect(granted, "the sender's allowance runs out").toBeLessThan(PAYMASTER_PER_IP_PER_MINUTE);
        reply = await ask(sender);
      }
      fromThisVisitor += 1; // the refused call counted against the visitor
      expect(reply).toEqual({ jsonrpc: "2.0", id: 1, error: REFUSALS.senderRateLimit.error });
      expect(granted).toBeGreaterThanOrEqual(PAYMASTER_PER_SENDER_PER_MINUTE);
      expect(granted).toBeLessThanOrEqual(PAYMASTER_PER_SENDER_PER_MINUTE + refilled(PAYMASTER_PER_SENDER_PER_MINUTE));

      // The limit is the sender's: the same visitor is still served for
      // other senders, one call each, until the visitor's own limit.
      reply = await ask(nextAccount().address);
      expect(reply.error, "another sender is served").toBeUndefined();
      fromThisVisitor += 1;
      for (;;) {
        reply = await ask(nextAccount().address);
        if (reply.error) break;
        fromThisVisitor += 1;
        expect(fromThisVisitor, "the visitor's allowance runs out").toBeLessThan(4 * PAYMASTER_PER_IP_PER_MINUTE);
      }
      expect(reply).toEqual({ jsonrpc: "2.0", id: 1, error: REFUSALS.visitorRateLimit.error });
      expect(fromThisVisitor).toBeGreaterThanOrEqual(PAYMASTER_PER_IP_PER_MINUTE);
      expect(fromThisVisitor).toBeLessThanOrEqual(PAYMASTER_PER_IP_PER_MINUTE + refilled(PAYMASTER_PER_IP_PER_MINUTE));
    },
  );
});
