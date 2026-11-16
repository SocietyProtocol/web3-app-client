import { parse, print, type DocumentNode } from "graphql";
import { clientIp, TokenBucketLimiter } from "@/lib/aa/rate-limit";
import { getGraphGatewayEnv } from "@/lib/server-env";
import { PERSISTED_GRAPH_DOCUMENTS } from "@/lib/persisted-graphql.generated";
import { stripDataUriImages } from "@/lib/strip-data-uri";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 20_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const ALLOWED_GRAPH_OPERATIONS = new Set(
  PERSISTED_GRAPH_DOCUMENTS.keys(),
);

// Bounded by TokenBucketLimiter's maxKeys, so one entry per visitor IP
// cannot grow without limit on a long-running process.
const requestLimiter = new TokenBucketLimiter(
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
);

/**
 * Gateway answers that mean "busy, try again shortly": passed on with their
 * status and Retry-After so the browser can retry. Answering them with 502
 * turned a full gateway queue into what looked like an outage (and behind
 * Cloudflare a 502 becomes an HTML error page).
 */
const GATEWAY_BUSY_STATUSES = new Set([429, 503]);
const DEFAULT_BUSY_RETRY_AFTER_SECONDS = 1;
const MAX_BUSY_RETRY_AFTER_SECONDS = 60;

/**
 * Gateway answers that refuse the request itself (its variables, its size):
 * passed on with their status. Behind Cloudflare a 502 becomes an HTML error
 * page, so a query the gateway does not allow looked like an outage. Every
 * other 4xx of the gateway (401, 403, 404, 415, ...) is this server's own
 * misconfiguration and stays a 502.
 */
const GATEWAY_REFUSALS_PASSED_ON = new Set([400, 413, 422]);
const MAX_LOGGED_MESSAGE_LENGTH = 200;

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

/** One log line per failed gateway call: operation and status, never variables. */
function logGatewayFailure(operationName: string, detail: string) {
  console.warn(`[api/graphql] ${operationName}: ${detail}`);
}

/** Retry-After in whole seconds as the gateway sent it, bounded; 1 otherwise. */
function busyRetryAfter(upstream: Response) {
  const value = upstream.headers.get("retry-after")?.trim() ?? "";
  if (!/^\d{1,6}$/.test(value)) return String(DEFAULT_BUSY_RETRY_AFTER_SECONDS);
  return String(Math.min(Number(value), MAX_BUSY_RETRY_AFTER_SECONDS));
}

async function discardBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // Nothing to do: the answer is not used.
  }
}

function isRateLimited(request: Request) {
  return !requestLimiter.take(clientIp(request.headers));
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
  if (
    body.operationName !== undefined &&
    typeof body.operationName !== "string"
  ) {
    throw new Error("GraphQL operationName must be a string");
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
    (body.operationName !== undefined &&
      operationName !== body.operationName) ||
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

/** The first error message of a gateway answer, for the log. Never the variables. */
function upstreamMessage(text: string) {
  try {
    const parsed: unknown = JSON.parse(text);
    const errors =
      parsed && typeof parsed === "object" && "errors" in parsed
        ? (parsed as { errors?: unknown }).errors
        : undefined;
    const first = Array.isArray(errors) ? errors[0] : undefined;
    const message =
      first && typeof first === "object" && "message" in first
        ? (first as { message?: unknown }).message
        : undefined;
    if (typeof message === "string" && message) {
      return message
        // Printable ASCII only: one log line, whatever the upstream sent.
        .replace(/[^\x20-\x7e]+/g, " ")
        .slice(0, MAX_LOGGED_MESSAGE_LENGTH);
    }
  } catch {
    // Not JSON: an HTML error page of a proxy, for instance.
  }
  return "no message";
}

function gatewayRefusal(status: number, operationName: string, text: string) {
  const passedOn = GATEWAY_REFUSALS_PASSED_ON.has(status);
  logGatewayFailure(
    operationName,
    `the query gateway refused the request with ${status} (${upstreamMessage(text)}); answering ${passedOn ? status : 502}`,
  );
  return passedOn
    ? jsonError("GraphQL gateway refused the request", status)
    : jsonError("GraphQL upstream request failed", 502);
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
    result.data = stripDataUriImages(source.data);
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

    if (GATEWAY_BUSY_STATUSES.has(upstream.status)) {
      await discardBody(upstream);
      const retryAfter = busyRetryAfter(upstream);
      logGatewayFailure(
        payload.operationName,
        `the query gateway is busy (${upstream.status}, retry-after ${retryAfter}s); answering ${upstream.status}`,
      );
      return jsonError("GraphQL gateway is busy, try again shortly", upstream.status, {
        "retry-after": retryAfter,
      });
    }

    const text = await readLimitedResponse(upstream);
    if (upstream.status >= 400 && upstream.status < 500) {
      return gatewayRefusal(upstream.status, payload.operationName, text);
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      logGatewayFailure(
        payload.operationName,
        `the query gateway answered ${upstream.status} with a body that is not JSON; answering 502`,
      );
      return jsonError("GraphQL upstream response was invalid", 502);
    }

    if (!upstream.ok) {
      logGatewayFailure(
        payload.operationName,
        `the query gateway answered ${upstream.status}; answering 502`,
      );
    }
    return Response.json(sanitizeResponse(body), {
      status: upstream.ok ? 200 : 502,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UpstreamResponseTooLargeError) {
      logGatewayFailure(payload.operationName, "the query gateway answer is too large; answering 502");
      return jsonError("GraphQL upstream response is too large", 502);
    }
    if (controller.signal.aborted) {
      logGatewayFailure(
        payload.operationName,
        `no answer from the query gateway in ${UPSTREAM_TIMEOUT_MS} ms; answering 504`,
      );
      return jsonError("GraphQL upstream request timed out", 504);
    }
    logGatewayFailure(
      payload.operationName,
      `the query gateway could not be reached (${error instanceof Error ? error.name : "unknown error"}); answering 502`,
    );
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
