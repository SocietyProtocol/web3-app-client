import { parse } from "graphql";
import { PERSISTED_GRAPH_DOCUMENTS } from "./persisted-graphql.generated";
import { getGraphGatewayEnv } from "./server-env";

const BROWSER_GRAPH_ENDPOINT = "/api/graphql";
const IS_CODEGEN = process.env.GRAPHCLIENT_CODEGEN === "1";

/**
 * Graph Client 3 sends a minified query, omits operationName, and adds
 * extensions. The query gateway and /api/graphql only accept the exact
 * persisted document plus operationName.
 */
export function persistOutgoingGraphRequest(
  init?: RequestInit,
): RequestInit | undefined {
  if (!init || typeof init.body !== "string") return init;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(init.body);
  } catch {
    return init;
  }
  if (typeof parsed.query !== "string") return init;

  let operationName =
    typeof parsed.operationName === "string"
      ? parsed.operationName
      : undefined;
  try {
    const document = parse(parsed.query);
    const operations = document.definitions.filter(
      (definition) => definition.kind === "OperationDefinition",
    );
    if (operations.length === 1 && operations[0].name?.value) {
      operationName = operations[0].name.value;
    }
  } catch {
    return init;
  }
  if (!operationName) return init;

  const persisted = PERSISTED_GRAPH_DOCUMENTS.get(operationName);
  if (!persisted) return init;

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return {
    ...init,
    headers,
    body: JSON.stringify({
      query: persisted,
      operationName,
      variables:
        parsed.variables &&
        typeof parsed.variables === "object" &&
        !Array.isArray(parsed.variables)
          ? parsed.variables
          : {},
    }),
  };
}

/**
 * Graph Client 3.x's generated transport accepts a custom fetch function.
 * Browser requests use the constrained same-origin route; SSR requests use
 * the protected gateway directly and add its server-only credential.
 */
const graphFetch: typeof fetch = async (input, init) => {
  if (typeof window !== "undefined") {
    if (input instanceof Request && init === undefined) {
      const rewritten = persistOutgoingGraphRequest({
        method: input.method,
        headers: input.headers,
        body: await input.clone().text(),
      });
      return fetch(BROWSER_GRAPH_ENDPOINT, rewritten);
    }
    return fetch(BROWSER_GRAPH_ENDPOINT, persistOutgoingGraphRequest(init));
  }

  // Schema generation still uses NEXT_PUBLIC_GRAPH_URL until the accurate
  // checked-in API SDL is available. Runtime SSR requests never take this
  // fallback because the app does not set GRAPHCLIENT_CODEGEN.
  if (IS_CODEGEN) {
    return fetch(input, init);
  }

  const { graphQueryGatewayUrl, graphQueryGatewayToken } =
    getGraphGatewayEnv();
  const rewritten = persistOutgoingGraphRequest(init);
  const headers = new Headers(rewritten?.headers ?? init?.headers);
  headers.set("authorization", `Bearer ${graphQueryGatewayToken}`);

  if (input instanceof Request && init === undefined) {
    const requestInit = persistOutgoingGraphRequest({
      method: input.method,
      headers: input.headers,
      body: await input.clone().text(),
    });
    const request = new Request(graphQueryGatewayUrl, requestInit);
    request.headers.set("authorization", `Bearer ${graphQueryGatewayToken}`);
    return fetch(request);
  }

  return fetch(graphQueryGatewayUrl, { ...rewritten, headers });
};

export default graphFetch;
