import { afterEach, describe, expect, it, vi } from "vitest";
import graphFetch from "./graph-fetch";

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
});
