import { afterEach, describe, expect, it, vi } from "vitest";
import { PERSISTED_GRAPH_DOCUMENTS } from "./persisted-graphql.generated";
import graphFetch, { persistOutgoingGraphRequest } from "./graph-fetch";

describe("Graph Client custom fetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
    delete process.env.GRAPH_QUERY_GATEWAY_URL;
    delete process.env.GRAPH_QUERY_GATEWAY_TOKEN;
  });

  it("uses the same-origin route in a browser", async () => {
    (globalThis as { window?: unknown }).window = {};
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    await graphFetch("https://old-subgraph.example/graphql", {
      method: "POST",
      body: "{}",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/graphql",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses the protected gateway during SSR", async () => {
    process.env.GRAPH_QUERY_GATEWAY_URL =
      "https://query-gateway.example/graphql";
    process.env.GRAPH_QUERY_GATEWAY_TOKEN = "server-token";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    await graphFetch("https://old-subgraph.example/graphql", {
      method: "POST",
      body: "{}",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://query-gateway.example/graphql",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer server-token",
    );
  });

  it("rewrites Graph Client Mesh bodies to the persisted document", () => {
    const rewritten = persistOutgoingGraphRequest({
      method: "POST",
      body: JSON.stringify({
        query:
          "query Communities($first:Int!$skip:Int!$orderBy:Community_orderBy!$orderDirection:OrderDirection!$where:Community_filter){communities(first:$first skip:$skip orderBy:$orderBy orderDirection:$orderDirection where:$where){id name description imageUrl metadata{imageUrl description}createdAt tierId tierName tierExpiresAt managerAddress manager{id name bio imageUrl metadata{name bio imageUrl}}memberCount}}",
        variables: { first: 50, skip: 0 },
        extensions: { endpoint: "https://example/graphql" },
      }),
    });

    expect(JSON.parse(String(rewritten?.body))).toEqual({
      query: PERSISTED_GRAPH_DOCUMENTS.get("Communities"),
      operationName: "Communities",
      variables: { first: 50, skip: 0 },
    });
  });
});
