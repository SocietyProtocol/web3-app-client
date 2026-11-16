import { IPFS_GATEWAY } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { authPayloadHeader } from "../../support/auth";
import { cidOf } from "../../support/backends/s3";

/**
 * /api/profile: pins profile metadata for a wallet that proves itself with a
 * signed, timestamped message. The pin goes to the S3 fake.
 */
test.describe("/api/profile", () => {
  test("P4: refuses a request without authentication", { tag: ["@core"] }, async ({ api, s3 }) => {
    const response = await api.post("/api/profile", { data: { name: "Nobody" } });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Missing authentication" });
    expect(await s3.requests()).toEqual([]);
  });

  test("P4: refuses a stale signature", { tag: ["@core"] }, async ({ api, nextAccount, s3 }) => {
    const account = nextAccount();
    const response = await api.post("/api/profile", {
      headers: await authPayloadHeader(account, { timestamp: Date.now() - 6 * 60 * 1000 }),
      data: { name: "Too late" },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Message expired" });
    expect(await s3.requests()).toEqual([]);
  });

  test("P4: refuses a signature made by another key", { tag: ["@core"] }, async ({ api, nextAccount, s3 }) => {
    const claimed = nextAccount();
    const signer = nextAccount();
    const response = await api.post("/api/profile", {
      headers: await authPayloadHeader(signer, { address: claimed.address }),
      data: { name: "Impostor" },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid signature" });
    expect(await s3.requests()).toEqual([]);
  });

  test(
    "P4: pins the metadata of an authenticated wallet and returns its gateway URI",
    { tag: ["@smoke"] },
    async ({ api, nextAccount, s3 }) => {
      const account = nextAccount();
      const response = await api.post("/api/profile", {
        headers: await authPayloadHeader(account),
        data: { name: "Ada", bio: "First programmer" },
      });
      expect(response.status()).toBe(200);
      const { uri } = (await response.json()) as { uri: string };
      expect(uri.startsWith(`${IPFS_GATEWAY}/`)).toBe(true);

      // What was pinned is what was sent, and it is retrievable by its CID.
      const pinned = await s3.getJson<{ name: string; bio: string; imageUrl: null }>(cidOf(uri));
      expect(pinned).toMatchObject({ name: "Ada", bio: "First programmer", imageUrl: null });
      expect((await s3.requests()).filter((request) => request.method === "PUT")).toHaveLength(1);
    },
  );

  test("P4: a failing pin is a 500, not a URI", { tag: ["@edge"] }, async ({ api, nextAccount, s3 }) => {
    const account = nextAccount();
    // The AWS SDK retries a 500 a few times; fail them all.
    await s3.failNext(10, 500);
    const response = await api.post("/api/profile", {
      headers: await authPayloadHeader(account),
      data: { name: "Unlucky" },
    });
    expect(response.status()).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
