import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";

/**
 * /api/graphql: the persisted-query gateway in front of the subgraph. Here
 * the upstream is the subgraph fake; the route code is the production code.
 */
test.describe("/api/graphql", () => {
  test(
    "P1: a persisted query is answered, and _meta follows the chain head",
    { tag: ["@smoke"] },
    async ({ graphql, chain, subgraph }) => {
      const head = Number(await chain.blockNumber());
      const status = await graphql<{ _meta: { block: { number: number } } }>("Status");
      expect(status.status).toBe(200);
      expect(status.errors).toBeUndefined();
      expect(status.data?._meta.block.number).toBeGreaterThanOrEqual(head);

      // The request reached the gateway with the server-side credential.
      const requests = await subgraph.requests();
      expect(requests.at(-1)).toMatchObject({ operationName: "Status", authorized: true });
    },
  );

  test(
    "P1: the Governor badge and its holders match the chain",
    { tag: ["@smoke"] },
    async ({ graphql, chain }) => {
      const result = await graphql<{
        badge: { id: string; name: string; holdersCount: string; holders: { id: string }[] } | null;
      }>("Badge", { id: GOVERNOR_BADGE });
      expect(result.status).toBe(200);
      const governor = result.data?.badge;
      expect(governor?.id).toBe(GOVERNOR_BADGE);
      expect(governor!.holders.length).toBeGreaterThan(0);
      expect(governor!.holders).toHaveLength(Number(governor!.holdersCount));

      // The baseline was recorded from the fork: every holder it lists holds the badge on chain.
      for (const holder of governor!.holders) {
        expect(await chain.badgeBalance(holder.id as `0x${string}`, GOVERNOR_BADGE), holder.id).toBeGreaterThan(
          BigInt(0),
        );
      }
    },
  );

  test("P2: refuses a query that is not a persisted document", { tag: ["@core"] }, async ({ api }) => {
    const response = await api.post("/api/graphql", {
      data: { query: "query Sneaky { users(first: 1000) { id } }", operationName: "Sneaky", variables: {} },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      errors: [{ message: "GraphQL operation does not match a persisted document" }],
    });
  });

  test("P2: refuses GET and a non-JSON content type", { tag: ["@core"] }, async ({ api }) => {
    const get = await api.get("/api/graphql");
    expect(get.status()).toBe(405);
    expect(get.headers().allow).toBe("POST");

    const text = await api.post("/api/graphql", {
      headers: { "content-type": "text/plain" },
      data: "query Status { _meta { block { number } } }",
    });
    expect(text.status()).toBe(415);
  });

  test("P6: an upstream failure is reported as 502 without leaking its body", { tag: ["@edge"] }, async ({
    graphql,
    subgraph,
  }) => {
    await subgraph.injectFaults({ kind: "http-error", status: 500, operation: "Status" });
    const failed = await graphql("Status");
    expect(failed.status).toBe(502);
    expect(failed.errors).toEqual([{ message: "GraphQL upstream response was invalid" }]);

    // The fault was for one request only.
    const next = await graphql("Status");
    expect(next.status).toBe(200);
  });
});
