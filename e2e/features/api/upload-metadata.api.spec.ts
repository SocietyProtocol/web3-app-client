import type { APIResponse } from "@playwright/test";
import type { LocalAccount } from "viem";
import { IPFS_GATEWAY } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { authMessage, authPayloadHeader } from "../../support/auth";
import { cidOf } from "../../support/backends/s3";

/**
 * The two routes that pin to IPFS for a wallet that proves itself with a
 * signed, timestamped message: /api/profile (profile metadata, validated)
 * and /api/upload-metadata (badge and community metadata, one object or a
 * list). profile.api.spec.ts has the first three refusals of /api/profile
 * and its happy path; this file has the rest of the authentication rules,
 * for both routes, the body validation, and /api/upload-metadata as a whole.
 * The pin goes to the S3 fake.
 */
const ROUTES = ["/api/profile", "/api/upload-metadata"] as const;

/** A 1x1 PNG. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const MINUTE = 60 * 1000;

/** An x-auth-payload header put together by hand, to get it wrong on purpose. */
async function authHeader(
  account: LocalAccount,
  build: (payload: { address: string; message: string; signature: string; timestamp: number }) => unknown,
  timestamp = Date.now(),
): Promise<Record<string, string>> {
  const message = authMessage(account.address, timestamp);
  const signature = await account.signMessage({ message });
  const payload = build({ address: account.address, message, signature, timestamp });
  return { "x-auth-payload": typeof payload === "string" ? payload : JSON.stringify(payload) };
}

async function expectError(response: APIResponse, status: number, error: string) {
  expect(response.status(), error).toBe(status);
  expect(await response.json(), error).toEqual({ error });
}

test.describe("/api/profile and /api/upload-metadata", () => {
  for (const route of ROUTES) {
    test(`P4: ${route} refuses a request whose proof of the wallet is missing, old, early or not the wallet's`, {
      tag: ["@core"],
    }, async ({ api, nextAccount, s3 }) => {
      const account = nextAccount();
      const other = nextAccount();
      const data = { name: "Nobody" };

      const cases: { what: string; headers: Record<string, string> | undefined; error: string }[] = [
        { what: "no header", headers: undefined, error: "Missing authentication" },
        {
          what: "a header that is not JSON",
          headers: { "x-auth-payload": "not json" },
          error: "Invalid authentication format",
        },
        {
          what: "no signature",
          headers: await authHeader(account, ({ address, message, timestamp }) => ({ address, message, timestamp })),
          error: "Missing authentication fields",
        },
        {
          what: "no address",
          headers: await authHeader(account, ({ message, signature, timestamp }) => ({ message, signature, timestamp })),
          error: "Missing authentication fields",
        },
        {
          what: "signed more than five minutes ago",
          headers: await authPayloadHeader(account, { timestamp: Date.now() - 6 * MINUTE }),
          error: "Message expired",
        },
        {
          what: "a timestamp in the future",
          headers: await authPayloadHeader(account, { timestamp: Date.now() + 5 * MINUTE }),
          error: "Invalid timestamp",
        },
        {
          what: "a message with another wording",
          headers: await authHeader(account, (payload) => ({
            ...payload,
            message: `${payload.message}\nAnd pin whatever I send.`,
          })),
          error: "Message format mismatch",
        },
        {
          what: "a message for another moment than the timestamp says",
          headers: await authHeader(account, (payload) => ({ ...payload, timestamp: payload.timestamp - 1 })),
          error: "Message format mismatch",
        },
        {
          what: "signed by another key",
          headers: await authPayloadHeader(other, { address: account.address }),
          error: "Invalid signature",
        },
      ];
      for (const { what, headers, error } of cases) {
        const response = await api.post(route, { headers, data });
        expect(response.status(), what).toBe(401);
        expect(await response.json(), what).toEqual({ error });
      }
      expect(await s3.requests(), "nothing was pinned").toEqual([]);
    });
  }

  test("P4: /api/profile refuses a body that is not JSON", { tag: ["@core"] }, async ({ api, nextAccount, s3 }) => {
    const response = await api.post("/api/profile", {
      headers: { ...(await authPayloadHeader(nextAccount())), "content-type": "application/json" },
      data: Buffer.from("{ not json", "utf8"),
    });
    await expectError(response, 400, "Invalid JSON in request body");
    expect(await s3.requests()).toEqual([]);
  });

  test(
    "P4: /api/profile validates name, bio and avatar and says which field is wrong",
    { tag: ["@core"] },
    async ({ api, nextAccount, s3 }) => {
      const headers = await authPayloadHeader(nextAccount());
      const oversizedPng = `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1, 1).toString("base64")}`;

      const cases: { data: Record<string, unknown>; details: Record<string, string[]> }[] = [
        { data: { name: "n".repeat(101) }, details: { name: ["Name must be 100 characters or less"] } },
        { data: { name: "Ada", bio: "b".repeat(501) }, details: { bio: ["Bio must be 500 characters or less"] } },
        {
          data: { name: "n".repeat(101), bio: "b".repeat(501) },
          details: { name: ["Name must be 100 characters or less"], bio: ["Bio must be 500 characters or less"] },
        },
        {
          data: { name: "Ada", imageUrl: "https://example.com/avatar.png" },
          details: { imageUrl: ["Avatar must be a valid image"] },
        },
        {
          data: { name: "Ada", imageUrl: "data:image/bmp;base64,Qk0=" },
          details: { imageUrl: ["Avatar must be a JPEG, PNG, WebP, SVG, or GIF image"] },
        },
        {
          data: { name: "Ada", imageUrl: oversizedPng },
          details: { imageUrl: ["Avatar size must not exceed 2MB"] },
        },
      ];
      for (const { data, details } of cases) {
        const response = await api.post("/api/profile", { headers, data });
        expect(response.status(), JSON.stringify(details)).toBe(400);
        expect(await response.json()).toEqual({ error: "Validation failed", details });
      }
      expect(await s3.requests(), "nothing was pinned").toEqual([]);

      // The limits themselves are allowed.
      const atTheLimit = await api.post("/api/profile", {
        headers,
        data: { name: "n".repeat(100), bio: "b".repeat(500) },
      });
      expect(atTheLimit.status()).toBe(200);
      const { uri } = (await atTheLimit.json()) as { uri: string };
      expect(await s3.getJson(cidOf(uri))).toMatchObject({ name: "n".repeat(100), bio: "b".repeat(500) });
    },
  );

  test(
    "P4: /api/profile pins an avatar by itself and stores its address in the metadata",
    { tag: ["@core"] },
    async ({ api, nextAccount, s3 }) => {
      const response = await api.post("/api/profile", {
        headers: await authPayloadHeader(nextAccount()),
        data: { name: "Ada", bio: "", imageUrl: `data:image/png;base64,${TINY_PNG_BASE64}` },
      });
      expect(response.status()).toBe(200);
      const { uri } = (await response.json()) as { uri: string };

      const pinned = await s3.getJson<{ name: string; bio: string | null; imageUrl: string }>(cidOf(uri));
      expect(pinned).toMatchObject({ name: "Ada", bio: null });
      // Not the data URI: the picture was pinned first, and the metadata points at it.
      expect(pinned!.imageUrl.startsWith(`${IPFS_GATEWAY}/`)).toBe(true);
      expect((await s3.get(cidOf(pinned!.imageUrl)))?.equals(Buffer.from(TINY_PNG_BASE64, "base64"))).toBe(true);
      expect((await s3.requests()).filter((request) => request.method === "PUT")).toHaveLength(2);
    },
  );

  test("P4: /api/upload-metadata refuses a body that is not an object or a list of objects", { tag: ["@core"] }, async ({
    api,
    nextAccount,
    s3,
  }) => {
    const headers = { ...(await authPayloadHeader(nextAccount())), "content-type": "application/json" };
    const send = (body: string) => api.post("/api/upload-metadata", { headers, data: Buffer.from(body, "utf8") });

    await expectError(await send("{ not json"), 400, "Invalid JSON in request body");
    await expectError(
      await send("[]"),
      400,
      "Request body must contain at least one metadata object (as an object or array)",
    );
    for (const body of ['"a string"', "7", "null", '[{"name":"ok"},"not an object"]', "[[]]", "[null]"]) {
      await expectError(await send(body), 400, "Each item must be a valid object");
    }
    expect(await s3.requests(), "nothing was pinned, not even the good item of a bad list").toEqual([]);
  });

  test(
    "P4: /api/upload-metadata pins one object, or every object of a list in order, and returns the gateway URIs",
    { tag: ["@smoke"] },
    async ({ api, nextAccount, s3 }) => {
      const headers = await authPayloadHeader(nextAccount());
      const badge = { name: "Early Member", description: "Joined in the first month.", attributes: [{ tier: 1 }] };

      const one = await api.post("/api/upload-metadata", { headers, data: badge });
      expect(one.status()).toBe(200);
      const single = (await one.json()) as { uris: string[] };
      expect(single.uris).toHaveLength(1);
      expect(single.uris[0].startsWith(`${IPFS_GATEWAY}/`)).toBe(true);
      // Unlike a profile, the object is pinned as it was sent.
      expect(await s3.getJson(cidOf(single.uris[0]))).toEqual(badge);

      const manager = { name: "Guild Manager", imageUrl: `data:image/png;base64,${TINY_PNG_BASE64}` };
      const member = { name: "Guild Member", description: "" };
      const many = await api.post("/api/upload-metadata", { headers, data: [manager, member] });
      expect(many.status()).toBe(200);
      const list = (await many.json()) as { uris: string[] };
      expect(list.uris).toHaveLength(2);
      expect(new Set(list.uris).size).toBe(2);

      const pinnedManager = await s3.getJson<{ name: string; imageUrl: string }>(cidOf(list.uris[0]));
      expect(pinnedManager!.name).toBe("Guild Manager");
      // A picture sent inline is pinned by itself; the metadata holds its address.
      expect(pinnedManager!.imageUrl.startsWith(`${IPFS_GATEWAY}/`)).toBe(true);
      expect((await s3.get(cidOf(pinnedManager!.imageUrl)))?.equals(Buffer.from(TINY_PNG_BASE64, "base64"))).toBe(true);
      expect(await s3.getJson(cidOf(list.uris[1]))).toEqual(member);
    },
  );

  test("P4: /api/upload-metadata answers 500 when the pin fails, with no URI", { tag: ["@edge"] }, async ({
    api,
    nextAccount,
    s3,
  }) => {
    // The AWS SDK retries a 500 a few times; fail them all.
    await s3.failNext(10, 500);
    const response = await api.post("/api/upload-metadata", {
      headers: await authPayloadHeader(nextAccount()),
      data: { name: "Unlucky" },
    });
    await expectError(response, 500, "Failed to upload metadata to IPFS");
    await s3.failNext(0);

    // An inline picture of a type that cannot be pinned fails the whole upload.
    const badImage = await api.post("/api/upload-metadata", {
      headers: await authPayloadHeader(nextAccount()),
      data: { name: "Bitmap", imageUrl: "data:image/bmp;base64,Qk0=" },
    });
    await expectError(badImage, 500, "Failed to upload metadata to IPFS");
  });
});
