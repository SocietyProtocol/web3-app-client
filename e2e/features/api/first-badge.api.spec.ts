import { toHex } from "viem";
import { CHAIN_ID, ENTRY_POINT_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { AA_RPC_PATH, paymasterStubCall, unsignedUserOperation, type JsonRpcReply } from "../../support/aa/requests";
import {
  FIRST_BADGE_HEADER,
  FIRST_BADGE_REASONS,
  freeBadgeCallData,
  nextNonce,
} from "../../support/first-badge";

/**
 * The free first badge on the server: GET /api/aa/first-badge and the
 * proxy's handling of a createBadge paymaster call. The stack runs with
 * SPONSOR_FIRST_BADGE unset; FIRST_BADGE_HEADER sends the suite's cookie
 * that turns it on for one request (src/lib/e2e-overrides.ts).
 *
 * Written without being run: @unverified until it has passed once.
 */
const statusPath = (sender: string) => `/api/aa/first-badge?chainId=${CHAIN_ID}&sender=${sender}`;

test.describe("free first badge: server", { tag: "@unverified" }, () => {
  test("P9: off by default: the status says disabled and the proxy refuses createBadge as before", { tag: ["@core"] }, async ({
    api,
    actor,
    chain,
  }) => {
    const member = await actor("member");
    const status = await api.get(statusPath(member.address));
    expect(status.status()).toBe(200);
    expect(status.headers()["cache-control"]).toBe("no-store");
    expect(await status.json()).toEqual({ enabled: false, eligible: false, reason: "disabled" });

    const userOperation = unsignedUserOperation({
      sender: member.address,
      callData: freeBadgeCallData("E2E P9 off"),
      nonce: toHex(await nextNonce(chain, member.address)),
    });
    const reply = (await (await api.post(AA_RPC_PATH, { data: paymasterStubCall(userOperation) })).json()) as JsonRpcReply;
    expect(reply.error).toEqual({ code: -32602, message: "User operation is outside the sponsorship allowlist" });
  });

  test("P9: on: a member without badges is eligible, and the proxy passes its createBadge to the paymaster", { tag: ["@core"] }, async ({
    api,
    actor,
    chain,
  }) => {
    const member = await actor("member");
    const status = await api.get(statusPath(member.address), { headers: FIRST_BADGE_HEADER });
    expect(await status.json()).toEqual({ enabled: true, eligible: true });

    const userOperation = unsignedUserOperation({
      sender: member.address,
      callData: freeBadgeCallData("E2E P9 on"),
      nonce: toHex(await nextNonce(chain, member.address)),
    });
    const reply = (await (
      await api.post(AA_RPC_PATH, { headers: FIRST_BADGE_HEADER, data: paymasterStubCall(userOperation) })
    ).json()) as JsonRpcReply;
    expect(reply.error).toBeUndefined();
    expect(reply.result).toBeDefined();
  });

  test("P9: on: an operation at a stale or foreign nonce is refused", { tag: ["@edge"] }, async ({ api, actor, chain }) => {
    const member = await actor("member");
    const next = await nextNonce(chain, member.address);
    for (const nonce of [next + BigInt(1), (BigInt(1) << BigInt(64)) | next]) {
      const userOperation = unsignedUserOperation({
        sender: member.address,
        callData: freeBadgeCallData("E2E P9 nonce"),
        nonce: toHex(nonce),
      });
      const reply = (await (
        await api.post(AA_RPC_PATH, { headers: FIRST_BADGE_HEADER, data: paymasterStubCall(userOperation) })
      ).json()) as JsonRpcReply;
      expect(reply.error).toEqual({ code: -32602, message: FIRST_BADGE_REASONS.nonce });
    }
  });

  test("P9: on: once the account has created a badge, the status says so and the proxy refuses", { tag: ["@core"] }, async ({
    api,
    actor,
    chain,
  }) => {
    const member = await actor("member");
    await chain.createBadge({ creator: member.address, name: "E2E P9 earlier", uri: "" });

    const status = await api.get(statusPath(member.address), { headers: FIRST_BADGE_HEADER });
    expect(await status.json()).toEqual({ enabled: true, eligible: false, reason: "used" });

    const userOperation = unsignedUserOperation({
      sender: member.address,
      callData: freeBadgeCallData("E2E P9 second"),
      nonce: toHex(await nextNonce(chain, member.address)),
    });
    const reply = (await (
      await api.post(AA_RPC_PATH, { headers: FIRST_BADGE_HEADER, data: paymasterStubCall(userOperation) })
    ).json()) as JsonRpcReply;
    expect(reply.error).toEqual({ code: -32602, message: FIRST_BADGE_REASONS.used });
  });

  test("P9: the status route refuses a bad chain or sender", { tag: ["@edge"] }, async ({ api }) => {
    expect((await api.get(`/api/aa/first-badge?chainId=5&sender=${ENTRY_POINT_ADDRESS}`)).status()).toBe(400);
    expect((await api.get(`/api/aa/first-badge?chainId=${CHAIN_ID}&sender=nope`)).status()).toBe(400);
  });
});
