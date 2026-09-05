import { parse, print, type DocumentNode } from "graphql";
import { getGraphGatewayEnv } from "@/lib/server-env";
import { PERSISTED_GRAPH_DOCUMENTS } from "@/lib/persisted-graphql.generated";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 8_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const ALLOWED_GRAPH_OPERATIONS = new Set(
  PERSISTED_GRAPH_DOCUMENTS.keys(),
);

const requestCounts = new Map<string, { count: number; resetAt: number }>();

class RequestBodyTooLargeError extends Error {}
class UpstreamResponseTooLargeError extends Error {}

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json(
    { errors: [{ message }] },
    {
      status,
      headers: { "cache-control": "no-store", ...headers },
    },
  );
}

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "unknown"
  );
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = getClientKey(request);
  const current = requestCounts.get(key);

  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

async function readLimitedBody(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

function validateRequestBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("GraphQL request body must be a JSON object");
  }

  const body = value as Record<string, unknown>;
  if (typeof body.query !== "string" || !body.query.trim()) {
    throw new Error("GraphQL request must include a query");
  }
  if (typeof body.operationName !== "string") {
    throw new Error("GraphQL request must include an operationName");
  }
  if (
    body.variables !== undefined &&
    (body.variables === null ||
      typeof body.variables !== "object" ||
      Array.isArray(body.variables))
  ) {
    throw new Error("GraphQL variables must be a JSON object");
  }

  let document: DocumentNode;
  try {
    document = parse(body.query);
  } catch {
    throw new Error("GraphQL query is invalid");
  }

  const operations = document.definitions.filter(
    (definition) => definition.kind === "OperationDefinition",
  );
  if (operations.length !== 1) {
    throw new Error("Exactly one GraphQL query operation is required");
  }

  const operation = operations[0];
  if (operation.kind !== "OperationDefinition" || operation.operation !== "query") {
    throw new Error("Only GraphQL query operations are allowed");
  }

  const operationName = operation.name?.value;
  if (
    !operationName ||
    operationName !== body.operationName ||
    !ALLOWED_GRAPH_OPERATIONS.has(operationName) ||
    PERSISTED_GRAPH_DOCUMENTS.get(operationName) !== print(document)
  ) {
    throw new Error("GraphQL operation does not match a persisted document");
  }

  return {
    query: body.query,
    variables: body.variables ?? {},
    operationName,
  };
}

async function readLimitedResponse(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new UpstreamResponseTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function sanitizeError(error: unknown) {
  const source = error && typeof error === "object" ? error : undefined;
  const safe: Record<string, unknown> = {
    message: "GraphQL upstream request failed",
  };

  if (source && "path" in source && Array.isArray(source.path)) {
    safe.path = source.path.filter(
      (part): part is string | number =>
        typeof part === "string" || typeof part === "number",
    );
  }
  if (source && "locations" in source && Array.isArray(source.locations)) {
    safe.locations = source.locations
      .filter(
        (location): location is { line: number; column: number } =>
          !!location &&
          typeof location === "object" &&
          typeof (location as { line?: unknown }).line === "number" &&
          typeof (location as { column?: unknown }).column === "number",
      )
      .map(({ line, column }) => ({ line, column }));
  }
  return safe;
}

function sanitizeResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { errors: [{ message: "GraphQL upstream response was invalid" }] };
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(source, "data")) {
    result.data = source.data;
  }
  if (Array.isArray(source.errors)) {
    result.errors = source.errors.map(sanitizeError);
  }
  if (!Object.keys(result).length) {
    result.errors = [{ message: "GraphQL upstream response was invalid" }];
  }
  return result;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return jsonError("Too many GraphQL requests", 429, {
      "retry-after": "60",
    });
  }

  let payload: ReturnType<typeof validateRequestBody>;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return jsonError("GraphQL requests must use application/json", 415);
    }

    const rawBody = await readLimitedBody(request);
    try {
      payload = validateRequestBody(JSON.parse(rawBody));
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid GraphQL request",
        400,
      );
    }
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonError("GraphQL request body is too large", 413);
    }
    return jsonError("GraphQL request body could not be read", 400);
  }

  let gateway: ReturnType<typeof getGraphGatewayEnv>;
  try {
    gateway = getGraphGatewayEnv();
  } catch {
    return jsonError("GraphQL gateway is not configured", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(gateway.graphQueryGatewayUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${gateway.graphQueryGatewayToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body: unknown;
    try {
      body = JSON.parse(await readLimitedResponse(upstream));
    } catch (error) {
      if (error instanceof UpstreamResponseTooLargeError) throw error;
      return jsonError("GraphQL upstream response was invalid", 502);
    }

    return Response.json(sanitizeResponse(body), {
      status: upstream.ok ? 200 : 502,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UpstreamResponseTooLargeError) {
      return jsonError("GraphQL upstream response is too large", 502);
    }
    if (controller.signal.aborted) {
      return jsonError("GraphQL upstream request timed out", 504);
    }
    return jsonError("GraphQL upstream request failed", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export function GET() {
  return jsonError("Method not allowed", 405, { allow: "POST" });
}

export function PUT() {
  return jsonError("Method not allowed", 405, { allow: "POST" });
}

export function PATCH() {
  return jsonError("Method not allowed", 405, { allow: "POST" });
}

export function DELETE() {
  return jsonError("Method not allowed", 405, { allow: "POST" });
}
