import { PERSISTED_GRAPH_DOCUMENTS } from "../../../src/lib/persisted-graphql.generated";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";

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
    variables: () => ({ first: 5, skip: 0, orderBy: "id", orderDirection: "asc" }),
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
    variables: () => ({ first: 5, skip: 0, orderBy: "id", orderDirection: "asc" }),
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

    const justUnder = body(limit - 1024);
    expect(justUnder.byteLength).toBeLessThanOrEqual(limit);
    const accepted = await api.post(GRAPHQL, { headers: JSON_HEADERS, data: justUnder });
    expect(accepted.status()).toBe(200);
    expect(((await accepted.json()) as GraphqlBody).data).toHaveProperty("_meta");
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
    "P8: a visitor's sixty-first request in a minute is refused with 429, and another visitor is still served",
    { tag: ["@core"] },
    async ({ api, graphql, testIp }) => {
      // Sixty requests use the allowance up. Refused ones count like any
      // other (the limit is checked first), so these do not load the subgraph.
      const started = Date.now();
      for (let sent = 1; sent <= 60; sent += 1) {
        const response = await api.post(GRAPHQL, { headers: { "content-type": "text/plain" }, data: "x" });
        expect(response.status(), `request ${sent}`).toBe(415);
      }
      // The window is one minute from the first request; the loop takes a second or two.
      expect(Date.now() - started, "the sixty requests fit into the minute").toBeLessThan(50_000);

      const refused = await api.post(GRAPHQL, { headers: { "content-type": "text/plain" }, data: "x" });
      expect(refused.status()).toBe(429);
      expect(refused.headers()["retry-after"]).toBe("60");
      expect(await refused.json()).toEqual(refusal("Too many GraphQL requests"));

      // A good query of the same visitor is refused as well.
      const good = await graphql("Status");
      expect(good.status).toBe(429);
      expect(good.errors).toEqual([{ message: "Too many GraphQL requests" }]);

      // The limit is the visitor's: someone at another address is served.
      const elsewhere = `198.51.100.${1 + (Number(testIp.split(".")[3]) % 254)}`;
      const served = await api.post(GRAPHQL, {
        headers: { "x-forwarded-for": elsewhere },
        data: { query: PERSISTED_GRAPH_DOCUMENTS.get("Status")!, operationName: "Status", variables: {} },
      });
      expect(served.status()).toBe(200);
      expect(((await served.json()) as GraphqlBody).data).toHaveProperty("_meta");
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
