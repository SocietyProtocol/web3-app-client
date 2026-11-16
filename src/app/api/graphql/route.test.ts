import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PERSISTED_GRAPH_DOCUMENTS } from "@/lib/persisted-graphql.generated";
import { GET, POST } from "./route";

const gatewayUrl = "https://gateway.example/graphql";
const communitiesQuery = readFileSync(
  resolve(process.cwd(), "src/queries/communities.graphql"),
  "utf8",
);

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("/api/graphql", () => {
  beforeEach(() => {
    process.env.GRAPH_QUERY_GATEWAY_URL = gatewayUrl;
    process.env.GRAPH_QUERY_GATEWAY_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GRAPH_QUERY_GATEWAY_URL;
    delete process.env.GRAPH_QUERY_GATEWAY_TOKEN;
  });

  it("loads exactly the checked-in query operation set", () => {
    expect(PERSISTED_GRAPH_DOCUMENTS.size).toBe(13);
  });

  it("accepts a minified Graph Client query without operationName", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { communities: [] } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await POST(
      request(
        {
          query:
            "query Communities($first:Int!$skip:Int!$orderBy:Community_orderBy!$orderDirection:OrderDirection!$where:Community_filter){communities(first:$first skip:$skip orderBy:$orderBy orderDirection:$orderDirection where:$where){id name description imageUrl metadata{imageUrl description}createdAt tierId tierName tierExpiresAt managerAddress manager{id name bio imageUrl metadata{name bio imageUrl}}memberCount}}",
          variables: { first: 50, skip: 0 },
          extensions: { endpoint: "https://example/graphql" },
        },
        { "x-forwarded-for": "route-test-minified" },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { communities: [] } });
    const init = upstreamFetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      query: expect.stringContaining("query Communities"),
      operationName: "Communities",
      variables: { first: 50, skip: 0 },
    });
  });

  it("accepts an allowlisted query and forwards only safe headers", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { communities: [] } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "should-not-be-forwarded",
        },
      }),
    );

    const response = await POST(
      request(
        {
          query: communitiesQuery,
          operationName: "Communities",
        },
        { "x-forwarded-for": "route-test-allow" },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { communities: [] } });
    expect(upstreamFetch).toHaveBeenCalledWith(
      gatewayUrl,
      expect.objectContaining({ method: "POST" }),
    );
    const init = upstreamFetch.mock.calls[0]?.[1] as RequestInit;
    const upstreamHeaders = new Headers(init.headers);
    expect(upstreamHeaders.get("authorization")).toBe("Bearer test-token");
    expect(upstreamHeaders.get("content-type")).toBe("application/json");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("strips data-URI photos from GraphQL data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            users: [
              {
                name: "Ada",
                imageUrl: "data:image/png;base64,abc",
                metadata: { imageUrl: "https://ipfs.io/ipfs/bafy" },
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await POST(
      request(
        {
          query: communitiesQuery,
          operationName: "Communities",
        },
        { "x-forwarded-for": "route-test-strip" },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        users: [
          {
            name: "Ada",
            imageUrl: null,
            metadata: { imageUrl: "https://ipfs.io/ipfs/bafy" },
          },
        ],
      },
    });
  });

  it("rejects unallowlisted operations and mutations", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      request(
        {
          query: "mutation CreateCommunity { createCommunity { id } }",
          operationName: "CreateCommunity",
        },
        { "x-forwarded-for": "route-test-reject" },
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: [{ message: "Only GraphQL query operations are allowed" }],
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects an altered selection set with an allowed operation name", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      request(
        {
          query: "query Communities { __typename }",
          operationName: "Communities",
        },
        { "x-forwarded-for": "route-test-altered-selection" },
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: [
        { message: "GraphQL operation does not match a persisted document" },
      ],
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("sanitizes upstream errors while preserving GraphQL response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          errors: [
            {
              message: "database password leaked",
              extensions: { stacktrace: ["secret"] },
              path: ["communities", 0],
            },
          ],
        }),
      ),
    );

    const response = await POST(
      request(
        {
          query: communitiesQuery,
          operationName: "Communities",
        },
        { "x-forwarded-for": "route-test-errors" },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: null,
      errors: [
        {
          message: "GraphQL upstream request failed",
          path: ["communities", 0],
        },
      ],
    });
  });

  describe("gateway refusals", () => {
    const refusedBy = (status: number, body: string) =>
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(body, {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
    const communities = (ip: string) =>
      POST(
        request(
          { query: communitiesQuery, operationName: "Communities" },
          { "x-forwarded-for": ip },
        ),
      );
    const gatewayError = (message: string) =>
      JSON.stringify({ errors: [{ message }] });

    it("passes a refused query on as a 400 and logs why, not as a 502", async () => {
      refusedBy(400, gatewayError("GraphQL variables exceed operation limits"));
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const response = await communities("route-test-gateway-400");

      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        errors: [{ message: "GraphQL gateway refused the request" }],
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toBe(
        "[api/graphql] Communities: the query gateway refused the request with 400 (GraphQL variables exceed operation limits); answering 400",
      );
    });

    it.each([413, 422])("passes a %i of the gateway on", async (status) => {
      refusedBy(status, gatewayError("GraphQL query is too large"));
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const response = await communities(`route-test-gateway-${status}`);

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({
        errors: [{ message: "GraphQL gateway refused the request" }],
      });
    });

    it.each([401, 403, 404, 415])(
      "answers a %i of the gateway (this server's own misconfiguration) with a 502, and logs it",
      async (status) => {
        refusedBy(status, gatewayError("Unauthorized"));
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const response = await communities(`route-test-gateway-${status}`);

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
          errors: [{ message: "GraphQL upstream request failed" }],
        });
        expect(warn.mock.calls[0][0]).toBe(
          `[api/graphql] Communities: the query gateway refused the request with ${status} (Unauthorized); answering 502`,
        );
      },
    );

    it("logs a refusal that is not JSON without its body, and one line only", async () => {
      refusedBy(400, "<html>\n<title>400 Bad Request</title>\n</html>");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const response = await communities("route-test-refusal-html");

      expect(response.status).toBe(400);
      expect(warn.mock.calls[0][0]).toBe(
        "[api/graphql] Communities: the query gateway refused the request with 400 (no message); answering 400",
      );
    });

    it("keeps a gateway message to one printable line in the log", async () => {
      refusedBy(400, gatewayError(`bad\nline\u0007 ${"x".repeat(300)}`));
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await communities("route-test-gateway-multiline");

      const line = String(warn.mock.calls[0][0]);
      expect(line).not.toMatch(/[\n\u0007]/);
      expect(line).toContain("(bad line ");
      expect(line.length).toBeLessThan(320);
    });
  });

  describe("gateway failures", () => {
    const communities = (visitor: string) =>
      POST(
        request(
          {
            query: communitiesQuery,
            operationName: "Communities",
            variables: { first: 5, skip: 0, where: { name_contains_nocase: "private-search" } },
          },
          { "x-forwarded-for": visitor },
        ),
      );
    const gatewayAnswer = (status: number, headers: Record<string, string> = {}) =>
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ errors: [{ message: "Query gateway is busy" }] }), {
          status,
          headers: { "content-type": "application/json", ...headers },
        }),
      );
    const loggedLines = (warn: { mock: { calls: unknown[][] } }) =>
      warn.mock.calls.map((call) => call.map(String).join(" "));

    it("passes a busy gateway 503 on with its Retry-After, and logs it", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      gatewayAnswer(503, { "retry-after": "1" });

      const response = await communities("route-test-busy-503");

      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe("1");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        errors: [{ message: "GraphQL gateway is busy, try again shortly" }],
      });
      expect(loggedLines(warn)).toEqual([
        "[api/graphql] Communities: the query gateway is busy (503, retry-after 1s); answering 503",
      ]);
    });

    it("passes a gateway 429 on and bounds or defaults its Retry-After", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      gatewayAnswer(429, { "retry-after": "3600" });
      const capped = await communities("route-test-busy-429-capped");
      expect(capped.status).toBe(429);
      expect(capped.headers.get("retry-after")).toBe("60");

      vi.restoreAllMocks();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      gatewayAnswer(429, { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" });
      const dated = await communities("route-test-busy-429-date");
      expect(dated.status).toBe(429);
      expect(dated.headers.get("retry-after")).toBe("1");

      vi.restoreAllMocks();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      gatewayAnswer(503);
      const missing = await communities("route-test-busy-503-missing");
      expect(missing.status).toBe(503);
      expect(missing.headers.get("retry-after")).toBe("1");
    });

    it("still answers 502 for other gateway errors, and logs them", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      gatewayAnswer(500);

      const response = await communities("route-test-gateway-500");

      expect(response.status).toBe(502);
      expect(loggedLines(warn)).toEqual([
        "[api/graphql] Communities: the query gateway answered 500; answering 502",
      ]);
    });

    it("logs a gateway answer that is not JSON", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("<html>bad gateway</html>", { status: 502 }),
      );

      const response = await communities("route-test-gateway-html");

      expect(response.status).toBe(502);
      expect(loggedLines(warn)).toEqual([
        "[api/graphql] Communities: the query gateway answered 502 with a body that is not JSON; answering 502",
      ]);
    });

    it("logs a gateway that cannot be reached, without the error message", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new TypeError("fetch failed: connect ECONNREFUSED gateway.internal:8080"),
      );

      const response = await communities("route-test-gateway-down");

      expect(response.status).toBe(502);
      expect(loggedLines(warn)).toEqual([
        "[api/graphql] Communities: the query gateway could not be reached (TypeError); answering 502",
      ]);
    });

    it("never logs variables or the gateway token", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      gatewayAnswer(503, { "retry-after": "1" });
      await communities("route-test-busy-private");
      gatewayAnswer(500);
      await communities("route-test-500-private");

      const lines = loggedLines(warn);
      expect(lines).toHaveLength(2);
      for (const line of lines) {
        expect(line).not.toContain("private-search");
        expect(line).not.toContain("test-token");
        expect(line).not.toContain(gatewayUrl);
      }
    });

    it("does not log a successful answer", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ data: { communities: [] } }), { status: 200 }),
      );

      expect((await communities("route-test-ok-quiet")).status).toBe(200);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("rate limit", () => {
    // A text body is refused with 415 after the rate-limit check, so a
    // served request makes no upstream call. The clock is frozen, so no
    // token refills while a loop runs.
    const fromVisitor = (ip: string, forwardedFor = "route-test-edge") =>
      POST(
        new Request("http://localhost/api/graphql", {
          method: "POST",
          headers: {
            "content-type": "text/plain",
            "cf-connecting-ip": ip,
            "x-forwarded-for": forwardedFor,
          },
          body: "{}",
        }),
      );
    const useUp = async (ip: string) => {
      for (let i = 0; i < 60; i += 1) {
        expect((await fromVisitor(ip)).status).toBe(415);
      }
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("keys on the visitor IP, not on the Cloudflare edge or a forwarded hop", async () => {
      const upstreamFetch = vi.spyOn(globalThis, "fetch");

      await useUp("route-test-visitor-a");
      const refused = await fromVisitor("route-test-visitor-a");
      expect(refused.status).toBe(429);
      expect(refused.headers.get("retry-after")).toBe("60");
      // Another forwarded hop does not give the visitor a fresh bucket.
      expect((await fromVisitor("route-test-visitor-a", "route-test-other-edge")).status).toBe(429);
      // Another visitor behind the same edge is served.
      expect((await fromVisitor("route-test-visitor-b")).status).toBe(415);
      expect(upstreamFetch).not.toHaveBeenCalled();
    });

    it("serves a burst of sixty, then one request a second, and the whole burst after a minute", async () => {
      await useUp("route-test-refill");
      expect((await fromVisitor("route-test-refill")).status).toBe(429);

      vi.advanceTimersByTime(999);
      expect((await fromVisitor("route-test-refill")).status).toBe(429);
      vi.advanceTimersByTime(1);
      expect((await fromVisitor("route-test-refill")).status).toBe(415);
      expect((await fromVisitor("route-test-refill")).status).toBe(429);

      vi.advanceTimersByTime(60_000);
      await useUp("route-test-refill");
      expect((await fromVisitor("route-test-refill")).status).toBe(429);
    });
  });

  it("limits request bodies and accepts POST only", async () => {
    const tooLarge = new Request("http://localhost/api/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(128 * 1024 + 1),
      },
      body: "{}",
    });

    expect((await POST(tooLarge)).status).toBe(413);
    expect((await GET()).status).toBe(405);
  });
});
