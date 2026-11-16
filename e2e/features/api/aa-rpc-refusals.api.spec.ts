import type { APIRequestContext, APIResponse } from "@playwright/test";
import { encodeFunctionData, isAddress, toHex, type Address, type Hex } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import {
  MAX_CALL_GAS_LIMIT,
  MAX_FEE_PER_GAS,
  MAX_PAYMASTER_VERIFICATION_GAS_LIMIT,
} from "../../../src/lib/aa/limits";
import {
  encodeCreateAccount,
  encodeCreateProfile,
  encodeExecute,
  encodeExecuteBatch,
} from "../../../src/lib/smart-account";
import { BADGES_ADDRESS, CHAIN_ID, ENTRY_POINT_ADDRESS, IPFS_GATEWAY } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { AA_RPC_PATH, paymasterStubCall, unsignedUserOperation, type JsonRpcReply } from "../../support/aa/requests";

/**
 * /api/aa/rpc, what the proxy refuses by itself (aa-rpc.api.spec.ts has the
 * health check, the allowlist's main cases and the rate limits). Every
 * refusal here is the proxy's own JSON-RPC error with HTTP 200 and code
 * -32602, given before anything is sent to the bundler or the paymaster.
 *
 * The messages are the ones in src/lib/pimlico-proxy.ts,
 * src/lib/smart-account.ts, src/lib/aa/limits.ts and
 * src/lib/aa/sender-check.ts.
 */
const A_PINNED_URI = `${IPFS_GATEWAY}/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku`;
/** Some contract that is neither the Light Account factory nor an Outpost contract. */
const ANOTHER_CONTRACT: Address = ENTRY_POINT_ADDRESS;

const INVALID_PARAMS = -32602;

type UserOperation = Record<string, unknown>;

const createProfileCall = (uri = A_PINNED_URI): Hex =>
  encodeExecute({ to: BADGES_ADDRESS, value: BigInt(0), data: encodeCreateProfile(uri) });

const rpc = (api: APIRequestContext, method: string, params: unknown[], id: unknown = 1) =>
  api.post(AA_RPC_PATH, { data: { jsonrpc: "2.0", id, method, params } });

/** The request for sponsorship the app makes first (ERC-7677). */
const askSponsorship = (api: APIRequestContext, userOperation: UserOperation, chainSlot: Hex = toHex(CHAIN_ID)) =>
  rpc(api, "pm_getPaymasterStubData", [userOperation, ENTRY_POINT_ADDRESS, chainSlot, {}]);

/** The gas estimate the app asks the bundler for. */
const askEstimate = (api: APIRequestContext, userOperation: UserOperation) =>
  rpc(api, "eth_estimateUserOperationGas", [userOperation, ENTRY_POINT_ADDRESS]);

async function expectRefused(response: APIResponse, message: string, id: unknown = 1) {
  expect(response.status(), message).toBe(200);
  expect(response.headers()["cache-control"], message).toBe("no-store");
  expect(await response.json(), message).toEqual({ jsonrpc: "2.0", id, error: { code: INVALID_PARAMS, message } });
}

test.describe("/api/aa/rpc: what the proxy refuses", () => {
  test(
    "P3: refuses a first user operation whose account does not come from the canonical factory at salt 0",
    { tag: ["@core"] },
    async ({ api, nextAccount, chain }) => {
      const owner = nextAccount().address;
      const sender = chain.societyAddress(owner);
      const canonical = unsignedUserOperation({ owner, sender, callData: createProfileCall() });

      const cases: { userOperation: UserOperation; message: string }[] = [
        {
          userOperation: { ...canonical, factory: ANOTHER_CONTRACT },
          message: "User operation deploys an unsupported account",
        },
        {
          userOperation: { ...canonical, factory: "not-an-address" },
          message: "User operation deploys an unsupported account",
        },
        {
          userOperation: { ...canonical, factoryData: encodeCreateAccount(owner, BigInt(1)) },
          message: "User operation uses a non-canonical account salt",
        },
        {
          userOperation: { ...canonical, factoryData: "0xdeadbeef" },
          message: "User operation factory data is not createAccount",
        },
        {
          userOperation: { ...canonical, factoryData: undefined },
          message: "User operation deployment is incomplete",
        },
        // The canonical factory and salt, for an account that is someone else's.
        {
          userOperation: { ...canonical, sender: chain.societyAddress(nextAccount().address) },
          message: "User operation sender does not match the owner",
        },
      ];

      // The same rule for a request for sponsorship and for the bundler.
      for (const { userOperation, message } of cases) {
        await expectRefused(await askSponsorship(api, userOperation), message);
        await expectRefused(await askEstimate(api, userOperation), message);
      }
    },
  );

  test(
    "P3: without a factory the sender must be a deployed canonical Light Account",
    { tag: ["@core", "@sponsored"] },
    async ({ api, actor, nextAccount, chain }) => {
      const notALightAccount = "User operation sender is not a Light Account";

      // A Light Account address that nobody deployed yet, for sponsorship
      // and for the bundler alike, and something that is no address.
      const undeployed = chain.societyAddress(nextAccount().address);
      expect(await chain.isContract(undeployed)).toBe(false);
      const fromUndeployed = unsignedUserOperation({ sender: undeployed, callData: createProfileCall() });
      await expectRefused(await askSponsorship(api, fromUndeployed), notALightAccount);
      await expectRefused(await askEstimate(api, fromUndeployed), notALightAccount);
      await expectRefused(
        await askSponsorship(api, unsignedUserOperation({ sender: "0x1234" as Address, callData: createProfileCall() })),
        "User operation sender is not an address",
      );

      // A member's deployed Light Account is let through to the paymaster.
      const member = await actor("member");
      expect(await chain.isContract(member.address)).toBe(true);
      const update = encodeExecute({
        to: BADGES_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: SocietyProtocolBadgesABI,
          functionName: "updateProfileURI",
          args: [member.profile!.badgeId, A_PINNED_URI],
        }),
      });
      const granted = await api.post(AA_RPC_PATH, {
        data: paymasterStubCall(unsignedUserOperation({ sender: member.address, callData: update, nonce: "0x1" })),
      });
      const reply = (await granted.json()) as JsonRpcReply;
      expect(reply.error).toBeUndefined();
      const paymaster = (reply.result as { paymaster?: string }).paymaster;
      expect(paymaster && isAddress(paymaster), "the stub names a paymaster contract").toBe(true);
    },
  );

  test(
    "P3: sponsorship is refused for everything but the allowlisted profile and invite calls",
    { tag: ["@core"] },
    async ({ api, nextAccount, chain }) => {
      const owner = nextAccount().address;
      const sender = chain.societyAddress(owner);
      const first = (callData: Hex | undefined): UserOperation => ({
        ...unsignedUserOperation({ owner, sender, callData: callData ?? "0x" }),
        callData,
      });
      const outsideAllowlist = "User operation is outside the sponsorship allowlist";
      const mint = encodeFunctionData({
        abi: SocietyProtocolBadgesABI,
        functionName: "mint",
        args: [owner, BigInt(69), BigInt(1), "0x"],
      });

      const cases: { what: string; callData: Hex | undefined; message: string }[] = [
        {
          what: "a profile whose metadata is not a pinned IPFS document",
          callData: createProfileCall("https://example.com/profile.json"),
          message: outsideAllowlist,
        },
        {
          what: "a profile call that carries ETH",
          callData: encodeExecute({ to: BADGES_ADDRESS, value: BigInt(1), data: encodeCreateProfile(A_PINNED_URI) }),
          message: outsideAllowlist,
        },
        {
          what: "the profile call data sent to another contract",
          callData: encodeExecute({ to: ANOTHER_CONTRACT, value: BigInt(0), data: encodeCreateProfile(A_PINNED_URI) }),
          message: outsideAllowlist,
        },
        {
          what: "a batch that hides a mint behind a profile",
          callData: encodeExecuteBatch([
            { to: BADGES_ADDRESS, value: BigInt(0), data: encodeCreateProfile(A_PINNED_URI) },
            { to: BADGES_ADDRESS, value: BigInt(0), data: mint },
          ]),
          message: outsideAllowlist,
        },
        {
          what: "call data that is not the Light Account's execute",
          callData: encodeCreateProfile(A_PINNED_URI),
          message: "User operation is not a Light Account execute call",
        },
        { what: "no call data", callData: undefined, message: "User operation is missing call data" },
      ];
      for (const { what, callData, message } of cases) {
        const response = await askSponsorship(api, first(callData));
        expect(response.status(), what).toBe(200);
        expect(((await response.json()) as JsonRpcReply).error, what).toEqual({ code: INVALID_PARAMS, message });
      }
    },
  );

  test("P3: the bundler methods relay calls to Outpost contracts only, without ETH", { tag: ["@core"] }, async ({
    api,
    nextAccount,
    chain,
  }) => {
    const owner = nextAccount().address;
    const sender = chain.societyAddress(owner);
    const notOutpost = "User operation target is not an Outpost contract";
    const elsewhere = encodeExecute({ to: ANOTHER_CONTRACT, value: BigInt(0), data: "0x" });
    const withEth = encodeExecute({ to: BADGES_ADDRESS, value: BigInt(1), data: encodeCreateProfile(A_PINNED_URI) });

    for (const callData of [elsewhere, withEth]) {
      const userOperation = unsignedUserOperation({ owner, sender, callData });
      await expectRefused(await askEstimate(api, userOperation), notOutpost);
      await expectRefused(await rpc(api, "eth_sendUserOperation", [userOperation, ENTRY_POINT_ADDRESS]), notOutpost);
    }
  });

  test(
    "P3: refuses another EntryPoint, a paymaster call for another chain, 7702 fields and gas above the sponsorship caps",
    { tag: ["@core"] },
    async ({ api, nextAccount, chain }) => {
      const owner = nextAccount().address;
      const canonical = unsignedUserOperation({
        owner,
        sender: chain.societyAddress(owner),
        callData: createProfileCall(),
      });

      await expectRefused(
        await rpc(api, "pm_getPaymasterStubData", [canonical, BADGES_ADDRESS, toHex(CHAIN_ID), {}]),
        "Only EntryPoint 0.7 is accepted",
      );
      await expectRefused(
        await rpc(api, "eth_estimateUserOperationGas", [canonical]),
        "Only EntryPoint 0.7 is accepted",
      );
      await expectRefused(await askSponsorship(api, canonical, "0x1"), "Paymaster chain id does not match");
      await expectRefused(
        await askSponsorship(api, { ...canonical, eip7702Auth: { address: ANOTHER_CONTRACT } }),
        "Only EntryPoint 0.7 user operations are accepted",
      );
      await expectRefused(await rpc(api, "pm_getPaymasterStubData", []), "Missing user operation");

      const caps: { field: string; value: string; message: string }[] = [
        {
          field: "callGasLimit",
          value: toHex(MAX_CALL_GAS_LIMIT + BigInt(1)),
          message: "User operation callGasLimit is above the sponsorship cap",
        },
        {
          field: "paymasterVerificationGasLimit",
          value: toHex(MAX_PAYMASTER_VERIFICATION_GAS_LIMIT + BigInt(1)),
          message: "User operation paymasterVerificationGasLimit is above the sponsorship cap",
        },
        {
          field: "maxFeePerGas",
          value: toHex(MAX_FEE_PER_GAS[CHAIN_ID] + BigInt(1)),
          message: "User operation maxFeePerGas is above the sponsorship cap",
        },
        {
          field: "preVerificationGas",
          value: "21000",
          message: "User operation preVerificationGas is not a hex quantity",
        },
      ];
      for (const { field, value, message } of caps) {
        await expectRefused(await askSponsorship(api, { ...canonical, [field]: value }), message);
      }

      // The caps themselves are allowed: the same operation at the limit is
      // not refused by the proxy.
      const atTheCap = await askSponsorship(api, { ...canonical, callGasLimit: toHex(MAX_CALL_GAS_LIMIT) });
      expect(((await atTheCap.json()) as JsonRpcReply).error).toBeUndefined();
    },
  );

  test("P3: refuses requests that are not one JSON-RPC call", { tag: ["@core"] }, async ({ api }) => {
    const chainId = { jsonrpc: "2.0", id: 5, method: "eth_chainId", params: [] };

    // A batch: the proxy reviews one call at a time. A list has no id of its own.
    await expectRefused(await api.post(AA_RPC_PATH, { data: [chainId, chainId] }), "Expected one JSON-RPC request", null);
    await expectRefused(await api.post(AA_RPC_PATH, { data: { jsonrpc: "2.0", id: 9, params: [] } }), "Missing method", 9);
    await expectRefused(
      await api.post(AA_RPC_PATH, {
        headers: { "content-type": "application/json" },
        data: Buffer.from("{ not json", "utf8"),
      }),
      "Invalid JSON",
      null,
    );
    // More than 256 KiB.
    await expectRefused(
      await api.post(AA_RPC_PATH, { data: { ...chainId, padding: "x".repeat(257 * 1024) } }),
      "Request is too large",
      null,
    );

    // The same call, as it should be sent, is answered.
    const answered = await api.post(AA_RPC_PATH, { data: chainId });
    const reply = (await answered.json()) as JsonRpcReply;
    expect(reply.error).toBeUndefined();
    expect(Number(reply.result)).toBe(CHAIN_ID);
  });
});
