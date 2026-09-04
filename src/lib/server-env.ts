export interface GraphGatewayEnv {
  graphQueryGatewayUrl: string;
  graphQueryGatewayToken: string;
}

/** Read query-gateway settings from server-only (non-NEXT_PUBLIC_) variables. */
export function getGraphGatewayEnv(): GraphGatewayEnv {
  const url = process.env.GRAPH_QUERY_GATEWAY_URL;
  const token = process.env.GRAPH_QUERY_GATEWAY_TOKEN;

  if (!url) {
    throw new Error("GRAPH_QUERY_GATEWAY_URL environment variable is not set");
  }
  if (!token) {
    throw new Error(
      "GRAPH_QUERY_GATEWAY_TOKEN environment variable is not set",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("GRAPH_QUERY_GATEWAY_URL must be an absolute URL");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("GRAPH_QUERY_GATEWAY_URL must use HTTP or HTTPS");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("GRAPH_QUERY_GATEWAY_URL must not contain credentials");
  }

  return {
    graphQueryGatewayUrl: parsedUrl.toString(),
    graphQueryGatewayToken: token,
  };
}
