import { getGraphGatewayEnv } from "./server-env";

const BROWSER_GRAPH_ENDPOINT = "/api/graphql";
const IS_CODEGEN = process.env.GRAPHCLIENT_CODEGEN === "1";

/**
 * Graph Client 3.x's generated transport accepts a custom fetch function.
 * Browser requests use the constrained same-origin route; SSR requests use
 * the protected gateway directly and add its server-only credential.
 */
const graphFetch: typeof fetch = async (input, init) => {
  if (typeof window !== "undefined") {
    if (input instanceof Request && init === undefined) {
      return fetch(new Request(BROWSER_GRAPH_ENDPOINT, input));
    }
    return fetch(BROWSER_GRAPH_ENDPOINT, init);
  }

  // Schema generation still uses NEXT_PUBLIC_GRAPH_URL until the accurate
  // checked-in API SDL is available. Runtime SSR requests never take this
  // fallback because the app does not set GRAPHCLIENT_CODEGEN.
  if (IS_CODEGEN) {
    return fetch(input, init);
  }

  const { graphQueryGatewayUrl, graphQueryGatewayToken } =
    getGraphGatewayEnv();
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${graphQueryGatewayToken}`);

  if (input instanceof Request && init === undefined) {
    const request = new Request(graphQueryGatewayUrl, input);
    request.headers.set("authorization", `Bearer ${graphQueryGatewayToken}`);
    return fetch(request);
  }

  return fetch(graphQueryGatewayUrl, { ...init, headers });
};

export default graphFetch;
