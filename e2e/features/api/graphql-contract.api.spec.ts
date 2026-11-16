import { PERSISTED_GRAPH_DOCUMENTS } from "../../../src/lib/persisted-graphql.generated";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import {
  GRAPHQL_BURST,
  GRAPHQL_REFILL_MS,
  cheapGraphqlRequest,
  mostServedIn,
  neighbourOf,
  useUpGraphqlAllowance,
} from "../../support/graphql-limit";

/**
 * /api/graphql, the rest of its contract (graphql.api.spec.ts has the
 * first half): every persisted query the UI sends is answered, everything
 * else is refused before it reaches the subgraph, a visitor is limited to
 * sixty requests a minute, and an upstream that fails is reported without
 * its own words.
 *
 * The upstream is the subgraph fake; the route code is the production code.
 */
const GRAPHQL = "/api/graphql";

type GraphqlBody = { data?: Record<string, unknown>; errors?: { message: string }[] };

/** The route's own error answer. */
const refusal = (message: string) => ({ errors: [{ message }] });

/** A body sent as it is: Playwright re-encodes a string that is not JSON when the content type is JSON. */
const raw = (text: string) => Buffer.from(text, "utf8");

const JSON_HEADERS = { "content-type": "application/json" };

/**
 * Variables for every persisted query, and what a good answer holds.
 * `subject` is an account the baseline knows (a Governor). Queries about
 * things the fake has no entities for (auction, locks, communities) are
 * answered with null or an empty list, which is a good answer.
 */
const OPERATIONS: Record<
  string,
  { variables: (subject: string) => Record<string, unknown>; check: (data: Record<string, unknown>, subject: string) => void }
> = {
  Status: {
    variables: () => ({}),
    check: (data) => {
      const meta = data._meta as { block: { number: number } };
      expect(meta.block.number).toBeGreaterThan(0);
    },
  },
  Badges: {
    variables: () => ({ first: 5, skip: 0, orderBy: "id", orderDirection: "asc" }),
    check: (data) => {
      const badges = data.badges as { id: string; name: string }[];
      expect(badges.length).toBeGreaterThan(0);
      expect(badges.length).toBeLessThanOrEqual(5);
    },
  },
  Badge: {
    variables: () => ({ id: GOVERNOR_BADGE }),
    check: (data) => expect((data.badge as { id: string }).id).toBe(GOVERNOR_BADGE),
  },
  User: {
    variables: (subject) => ({ id: subject }),
    check: (data, subject) => {
      const user = data.user as { id: string; badges: { id: string }[] };
      expect(user.id).toBe(subject);
      expect(user.badges.map((badge) => badge.id)).toContain(GOVERNOR_BADGE);
    },
  },
  Users: {
    // The gateway allows only the sorts the app uses (e2e/support/backends/gateway).
    variables: () => ({ first: 5, skip: 0, orderBy: "name", orderDirection: "asc" }),
    check: (data) => {
      const users = data.users as { id: string }[];
      expect(users.length).toBeGreaterThan(0);
      expect(users.length).toBeLessThanOrEqual(5);
    },
  },
  Auction: {
    variables: () => ({ id: "1" }),
    check: (data) => expect(data).toHaveProperty("auctionDetail"),
  },
  AuctionStatus: {
    variables: () => ({ id: "1" }),
    check: (data) => expect(data).toHaveProperty("auctionDetail"),
  },
  Orders: {
    variables: (subject) => ({ auctionId: "1", user: subject }),
    check: (data) => expect(Array.isArray(data.orders)).toBe(true),
  },
  LockTransactions: {
    variables: (subject) => ({ user: subject }),
    check: (data) => expect(Array.isArray(data.lockTransactions)).toBe(true),
  },
  Communities: {
    variables: () => ({ first: 5, skip: 0, orderBy: "createdAt", orderDirection: "asc" }),
    check: (data) => expect(Array.isArray(data.communities)).toBe(true),
  },
  Community: {
    variables: () => ({ id: "1" }),
    check: (data) => expect(data).toHaveProperty("community"),
  },
  CommunityMembers: {
    variables: () => ({ first: 5, skip: 0 }),
    check: (data) => expect(Array.isArray(data.communityMemberships)).toBe(true),
  },
  CommunityActivities: {
    variables: () => ({ communityId: "1", first: 5, skip: 0 }),
    check: (data) => expect(Array.isArray(data.communityActivityEvents)).toBe(true),
  },
};

test.describe("/api/graphql: the whole contract", () => {
  test("P1: there is a check here for every persisted query, and for nothing else", { tag: ["@smoke"] }, () => {
    // A new query under src/queries must get its variables in OPERATIONS.
    expect(Object.keys(OPERATIONS).sort()).toEqual([...PERSISTED_GRAPH_DOCUMENTS.keys()].sort());
  });

  for (const operationName of PERSISTED_GRAPH_DOCUMENTS.keys()) {
    test(`P1: the persisted query ${operationName} is accepted and answered`, { tag: ["@smoke"] }, async ({
      graphql,
      subgraph,
    }) => {
      const operation = OPERATIONS[operationName];
      expect(operation, `variables for ${operationName} in this file`).toBeDefined();
      const subject = (await subgraph.holdersOf(GOVERNOR_BADGE))[0];
      expect(subject, "the baseline has a Governor").toBeDefined();

      const result = await graphql<Record<string, unknown>>(operationName, operation.variables(subject));
      expect(result.status).toBe(200);
      expect(result.errors, JSON.stringify((await subgraph.requests()).at(-1)?.errors)).toBeUndefined();
      expect(result.data).toBeDefined();
      operation.check(result.data!, subject);

      // It was passed on under its name, with the server's credential.
      expect((await subgraph.requests()).at(-1)).toMatchObject({ operationName, authorized: true });
    });
  }

  test("P2: refuses a mutation, a subscription and a document with two operations", { tag: ["@core"] }, async ({
    api,
    subgraph,
  }) => {
    const status = PERSISTED_GRAPH_DOCUMENTS.get("Status")!;
    const cases: { query: string; operationName?: string; message: string }[] = [
      {
        query: "mutation Sneaky { __typename }",
        operationName: "Sneaky",
        message: "Only GraphQL query operations are allowed",
      },
      {
        query: "subscription Sneaky { _meta { block { number } } }",
        operationName: "Sneaky",
        message: "Only GraphQL query operations are allowed",
      },
      // A persisted query with a second operation behind it.
      {
        query: `${status}\nquery Sneaky { users(first: 1000) { id } }`,
        operationName: "Status",
        message: "Exactly one GraphQL query operation is required",
      },
      // A fragment alone is no operation at all.
      {
        query: "fragment Sneaky on User { id }",
        message: "Exactly one GraphQL query operation is required",
      },
    ];
    for (const { query, operationName, message } of cases) {
      const response = await api.post(GRAPHQL, { data: { query, operationName, variables: {} } });
      expect(response.status(), query).toBe(400);
      expect(await response.json(), query).toEqual(refusal(message));
    }
    expect(await subgraph.requests(), "nothing reached the subgraph").toEqual([]);
  });

  test(
    "P2: refuses a persisted query that was changed, renamed or sent under another name",
    { tag: ["@core"] },
    async ({ api, subgraph }) => {
      const users = PERSISTED_GRAPH_DOCUMENTS.get("Users")!;
      const status = PERSISTED_GRAPH_DOCUMENTS.get("Status")!;
      const notPersisted = refusal("GraphQL operation does not match a persisted document");
      const variables = { first: 1000, skip: 0, orderBy: "id", orderDirection: "asc" };

      // One more field than the persisted document asks for.
      expect(users).toContain("profile {");
      const widened = users.replace("profile {", "invitedBy { id }\n    profile {");
      expect(widened).not.toBe(users);
      // The persisted text under a name of its own.
      const renamed = status.replace("query Status", "query Anything");
      expect(renamed).not.toBe(status);
      // An anonymous query.
      const anonymous = "{ _meta { block { number } } }";

      const cases: { query: string; operationName?: string; variables?: Record<string, unknown> }[] = [
        { query: widened, operationName: "Users", variables },
        { query: renamed, operationName: "Anything" },
        { query: status, operationName: "Users" },
        { query: anonymous },
      ];
      for (const { query, operationName, variables: sent } of cases) {
        const response = await api.post(GRAPHQL, { data: { query, operationName, variables: sent ?? {} } });
        expect(response.status(), query).toBe(400);
        expect(await response.json(), query).toEqual(notPersisted);
      }
      expect(await subgraph.requests(), "nothing reached the subgraph").toEqual([]);

      // The persisted text itself, without the optional operationName, is served.
      const plain = await api.post(GRAPHQL, { data: { query: status } });
      expect(plain.status()).toBe(200);
      expect(((await plain.json()) as GraphqlBody).errors).toBeUndefined();
    },
  );

  test("P2: refuses a body that is not a GraphQL request", { tag: ["@core"] }, async ({ api, subgraph }) => {
    const status = PERSISTED_GRAPH_DOCUMENTS.get("Status")!;
    const cases: { body: unknown; message: string }[] = [
      { body: [{ query: status }], message: "GraphQL request body must be a JSON object" },
      { body: "a string", message: "GraphQL request body must be a JSON object" },
      { body: { operationName: "Status" }, message: "GraphQL request must include a query" },
      { body: { query: "   " }, message: "GraphQL request must include a query" },
      { body: { query: status, operationName: 7 }, message: "GraphQL operationName must be a string" },
      { body: { query: status, variables: ["first"] }, message: "GraphQL variables must be a JSON object" },
      { body: { query: status, variables: null }, message: "GraphQL variables must be a JSON object" },
      { body: { query: "query Status { _meta {" }, message: "GraphQL query is invalid" },
    ];
    for (const { body, message } of cases) {
      const response = await api.post(GRAPHQL, { headers: JSON_HEADERS, data: raw(JSON.stringify(body)) });
      expect(response.status(), message).toBe(400);
      expect(await response.json(), JSON.stringify(body)).toEqual(refusal(message));
      expect(response.headers()["cache-control"]).toBe("no-store");
    }

    // Not JSON at all.
    const notJson = await api.post(GRAPHQL, { headers: JSON_HEADERS, data: raw("{ not json") });
    expect(notJson.status()).toBe(400);
    expect(((await notJson.json()) as GraphqlBody).errors).toHaveLength(1);
    expect(await subgraph.requests(), "nothing reached the subgraph").toEqual([]);
  });

  test("P2: refuses a body of more than 128 KiB, and takes one just under it", { tag: ["@core"] }, async ({
    api,
    subgraph,
  }) => {
    const query = PERSISTED_GRAPH_DOCUMENTS.get("Status")!;
    const limit = 128 * 1024;
    // The persisted query with a variable it does not use, as padding.
    const body = (padding: number) =>
      raw(JSON.stringify({ query, operationName: "Status", variables: { padding: "x".repeat(padding) } }));

    const tooLarge = body(limit);
    expect(tooLarge.byteLength).toBeGreaterThan(limit);
    const refused = await api.post(GRAPHQL, { headers: JSON_HEADERS, data: tooLarge });
    expect(refused.status()).toBe(413);
    expect(await refused.json()).toEqual(refusal("GraphQL request body is too large"));
    expect(await subgraph.requests(), "nothing reached the subgraph").toEqual([]);

    // The route takes it and passes it on. The query gateway behind it then
    // refuses the variable that Status does not declare, as it does on
    // staging, and the route passes that refusal on as a 400 (not a 502).
    const justUnder = body(limit - 1024);
    expect(justUnder.byteLength).toBeLessThanOrEqual(limit);
    const accepted = await api.post(GRAPHQL, { headers: JSON_HEADERS, data: justUnder });
    expect(await subgraph.requests(), "the route passed it on").toHaveLength(1);
    expect((await subgraph.requests())[0].refused).toEqual({ status: 400, message: "Undeclared GraphQL variable" });
    expect(accepted.status()).toBe(400);
    expect(await accepted.json()).toEqual(refusal("GraphQL gateway refused the request"));
  });

  test("P2: PUT, PATCH and DELETE are refused like GET", { tag: ["@core"] }, async ({ api }) => {
    const data = { query: PERSISTED_GRAPH_DOCUMENTS.get("Status")!, operationName: "Status", variables: {} };
    const responses = {
      PUT: await api.put(GRAPHQL, { data }),
      PATCH: await api.patch(GRAPHQL, { data }),
      DELETE: await api.delete(GRAPHQL, { data }),
    };
    for (const [verb, response] of Object.entries(responses)) {
      expect(response.status(), verb).toBe(405);
      expect(response.headers().allow, verb).toBe("POST");
      expect(await response.json(), verb).toEqual(refusal("Method not allowed"));
    }
  });

  test(
    "P8: a visitor is served a burst of sixty requests at once, and the next is refused with 429, also a good query",
    { tag: ["@core"] },
    async ({ api, graphql }) => {
      // Refused requests take a token like any other (the limit is checked
      // first), so these do not load the subgraph.
      const { served, elapsedMs, refused } = await useUpGraphqlAllowance(api);
      // The whole burst at once, and no more than refilled meanwhile (one a second).
      expect(served).toBeGreaterThanOrEqual(GRAPHQL_BURST);
      expect(served, `served in ${elapsedMs} ms`).toBeLessThanOrEqual(mostServedIn(elapsedMs));
      expect(refused.headers()["retry-after"]).toBe("60");
      expect(refused.headers()["cache-control"]).toBe("no-store");
      expect(await refused.json()).toEqual(refusal("Too many GraphQL requests"));

      // A good query of the same visitor, right after, is refused as well.
      const good = await graphql("Status");
      expect(good.status).toBe(429);
      expect(good.errors).toEqual([{ message: "Too many GraphQL requests" }]);
    },
  );

  test(
    "P8: two visitors do not share a bucket: another Cloudflare visitor IP is served, another x-forwarded-for is not",
    { tag: ["@core"] },
    async ({ api, testIp }) => {
      // Behind Cloudflare and Caddy every visitor of one edge arrives with the
      // same x-forwarded-for hop; the route tells them apart by
      // cf-connecting-ip. Here the edge hop is the one this test sends anyway.
      const neighbour = neighbourOf(testIp);
      const status = { query: PERSISTED_GRAPH_DOCUMENTS.get("Status")!, operationName: "Status", variables: {} };
      await useUpGraphqlAllowance(api);

      // The neighbour at the same edge is served: their own bucket is full.
      const neighbourServed = await api.post(GRAPHQL, {
        headers: { "cf-connecting-ip": neighbour, "x-forwarded-for": testIp },
        data: status,
      });
      expect(neighbourServed.status()).toBe(200);
      expect(((await neighbourServed.json()) as GraphqlBody).data).toHaveProperty("_meta");

      // The visitor who used theirs up cannot get a fresh one by sending
      // another x-forwarded-for, or a list of them.
      for (const forwarded of [neighbour, `${neighbour}, ${testIp}`, `${testIp}, ${neighbour}`]) {
        const spoofed = await cheapGraphqlRequest(api, { "x-forwarded-for": forwarded });
        expect(spoofed.status(), `x-forwarded-for: ${forwarded}`).toBe(429);
      }

      // And the neighbour's bucket is still their own: using it up does not
      // touch anyone else's, and is not touched by this visitor's requests.
      const { served } = await useUpGraphqlAllowance(api, { "cf-connecting-ip": neighbour, "x-forwarded-for": testIp });
      expect(served, "the neighbour had the whole burst but the one Status query").toBeGreaterThanOrEqual(
        GRAPHQL_BURST - 1,
      );
    },
  );

  test(
    "P8: a visitor who used the burst up is served again one request a second, not after a whole minute",
    { tag: ["@core"] },
    async ({ api }) => {
      await useUpGraphqlAllowance(api);

      // The next token comes within a second of the refusal (polled; the
      // refused polls take nothing, a bucket below one token is left as it is).
      const servedAgain = async () => {
        let at = 0;
        await expect
          .poll(
            async () => {
              const status = (await cheapGraphqlRequest(api)).status();
              if (status === 415) at = Date.now();
              return status;
            },
            { intervals: [50], timeout: 3 * GRAPHQL_REFILL_MS, message: "a token has refilled" },
          )
          .toBe(415);
        return at;
      };
      const first = await servedAgain();
      // One token, not the whole burst: the request right after is refused.
      expect((await cheapGraphqlRequest(api)).status()).toBe(429);

      // The one after that comes about a second later: the rate is sixty a minute.
      const second = await servedAgain();
      expect(second - first, "the second token came a refill interval after the first").toBeGreaterThanOrEqual(
        0.8 * GRAPHQL_REFILL_MS,
      );
      expect((await cheapGraphqlRequest(api)).status()).toBe(429);
    },
  );

  test("P6: an upstream answer that is not JSON is a 502", { tag: ["@edge"] }, async ({ graphql, subgraph }) => {
    await subgraph.injectFaults({ kind: "invalid-json", operation: "Status" });
    const failed = await graphql("Status");
    expect(failed.status).toBe(502);
    expect(failed.errors).toEqual([{ message: "GraphQL upstream response was invalid" }]);
    expect(failed.data).toBeUndefined();
  });

  test(
    "P6: an upstream GraphQL error is passed on without its wording",
    { tag: ["@edge"] },
    async ({ api, subgraph }) => {
      const upstreamWording = "indexing_error: deployment QmSecretDeployment failed at block 123";
      await subgraph.injectFaults({ kind: "graphql-error", message: upstreamWording, operation: "Status" });

      const response = await api.post(GRAPHQL, {
        data: { query: PERSISTED_GRAPH_DOCUMENTS.get("Status")!, operationName: "Status", variables: {} },
      });
      // The upstream answered, so this is not a gateway failure; the error is the route's own text.
      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(JSON.parse(text)).toEqual(refusal("GraphQL upstream request failed"));
      expect(text).not.toContain("QmSecretDeployment");
      expect(text).not.toContain("indexing_error");
    },
  );

  test(
    "P6: an upstream that does not answer within twenty seconds is a 504",
    { tag: ["@edge"] },
    async ({ api, subgraph }) => {
      // The route gives up after 20 s (UPSTREAM_TIMEOUT_MS); the server has
      // no clock a test could move, so this test takes that long.
      await subgraph.injectFaults({ kind: "delay", ms: 23_000, operation: "Status" });
      const started = Date.now();
      // Its own timeout: the default one (E2E_EXPECT_TIMEOUT_MS) may be
      // shorter than the route's 20 s.
      const response = await api.post(GRAPHQL, {
        data: { query: PERSISTED_GRAPH_DOCUMENTS.get("Status")!, operationName: "Status", variables: {} },
        timeout: 30_000,
      });
      expect(response.status()).toBe(504);
      expect(((await response.json()) as GraphqlBody).errors).toEqual([
        { message: "GraphQL upstream request timed out" },
      ]);
      expect(Date.now() - started).toBeGreaterThanOrEqual(19_000);
      expect(Date.now() - started, "the route did not wait for the upstream").toBeLessThan(23_000);
    },
  );
});
