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
            "query Communities($first:Int!$skip:Int!$orderBy:Community_orderBy!$orderDirection:OrderDirection!$where:Community_filter){communities(first:$first skip:$skip orderBy:$orderBy orderDirection:$orderDirection where:$where){id name description imageUrl createdAt tierId tierName tierExpiresAt managerAddress manager{id name bio imageUrl}memberCount}}",
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
