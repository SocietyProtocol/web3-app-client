// The query gateway's request checks, for the subgraph fake.
//
// In front of the real subgraph sits the query gateway
// (web3-app-subgraph, infra/query-gateway/server.js). It serves only the
// persisted documents of its registry, and refuses with a 400 any variables
// outside the operation's variablePolicy: unknown filter keys, filters that
// nest too deep, numbers or strings out of range, undeclared variables.
// Without these checks the fake answered requests that staging and
// production refuse (the member search of K5 passed here while it failed
// everywhere else).
//
// registry.cjs is a verbatim snapshot of the gateway's generated/registry.js;
// source.json says which commit it came from. The checks below are a port of
// the gateway's parseGraphQLRequest, canonicalizeApprovedDocument and
// validateVariables at that commit. Both are refreshed together with
// refresh.mjs (see README.md next to this file). Keep the port line by line
// close to the gateway: the error messages and the order of the checks are
// the gateway's.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Kind, parse, print, visit } from "graphql";

const require = createRequire(import.meta.url);
/** @type {{ PERSISTED_DOCUMENTS: Record<string, { sha256: string; query: string; variablePolicy: any }> }} */
const { PERSISTED_DOCUMENTS } = require("./registry.cjs");

export { PERSISTED_DOCUMENTS };

/** Which gateway commit the snapshot is from. */
export const GATEWAY_SOURCE = JSON.parse(fs.readFileSync(new URL("./source.json", import.meta.url), "utf8"));

const MAX_QUERY_BYTES = 8 * 1024;
const MAX_GRAPHQL_TOKENS = 512;

/** A refusal the gateway would send: `{ errors: [{ message }] }` with this status. */
export class GatewayRefusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function rejectIntrospection(document) {
  let found = false;
  visit(document, {
    Field(node) {
      if (node.name.value === "__schema" || node.name.value === "__type") found = true;
    },
  });
  return found;
}

function canonicalizeApprovedDocument(query) {
  let document;
  try {
    document = parse(query, { maxTokens: MAX_GRAPHQL_TOKENS });
  } catch {
    throw new GatewayRefusal(400, "Invalid GraphQL request");
  }

  if (rejectIntrospection(document)) throw new GatewayRefusal(400, "Introspection is not allowed");
  const operations = document.definitions.filter((definition) => definition.kind === Kind.OPERATION_DEFINITION);
  if (operations.length !== 1) throw new GatewayRefusal(400, "Only one named query is allowed");

  const operation = operations[0];
  if (operation.operation !== "query" || !operation.name) {
    throw new GatewayRefusal(400, "Only named queries are allowed");
  }

  const operationName = operation.name.value;
  const persisted = Object.hasOwn(PERSISTED_DOCUMENTS, operationName) ? PERSISTED_DOCUMENTS[operationName] : undefined;
  const canonicalQuery = print(document);
  if (!persisted || canonicalQuery !== persisted.query || sha256(canonicalQuery) !== persisted.sha256) {
    throw new GatewayRefusal(400, "GraphQL document is not an approved persisted query");
  }
  return { operationName, query: persisted.query };
}

function variableLimitError() {
  return new GatewayRefusal(400, "GraphQL variables exceed operation limits");
}

function validateFilterValue(value, depth, policy, counters) {
  counters.nodes += 1;
  if (counters.nodes > policy.maxNodes || depth > policy.maxDepth) throw variableLimitError();
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > policy.maxStringBytes) throw variableLimitError();
    return;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Math.abs(value) > policy.maxNumericValue) throw variableLimitError();
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > policy.maxArrayLength) throw variableLimitError();
    for (const item of value) validateFilterValue(item, depth + 1, policy, counters);
    return;
  }
  if (!isPlainObject(value) || Object.keys(value).length > policy.maxObjectKeys) throw variableLimitError();
  for (const [key, item] of Object.entries(value)) {
    if (Buffer.byteLength(key, "utf8") > 128 || !policy.allowedKeys.includes(key)) throw variableLimitError();
    validateFilterValue(item, depth + 1, policy, counters);
  }
}

function validateScalarValue(value, definition, limits) {
  if (value === null) {
    if (definition.required) throw variableLimitError();
    return;
  }
  if (definition.kind === "integer") {
    if (!Number.isSafeInteger(value) || value < definition.min || value > definition.max) throw variableLimitError();
    return;
  }
  if (definition.kind === "enum") {
    if (typeof value !== "string" || !definition.allowedValues.includes(value)) throw variableLimitError();
    return;
  }
  if (definition.kind === "id") {
    if (typeof value !== "string" && (!Number.isSafeInteger(value) || value < 0 || value > limits.maxNumericValue)) {
      throw variableLimitError();
    }
  } else if (definition.kind === "bigint") {
    if (typeof value === "string") {
      if (!/^[0-9]+$/.test(value) || value.length > definition.maxDigits) throw variableLimitError();
    } else if (!Number.isSafeInteger(value) || value < 0 || value > limits.maxNumericValue) {
      throw variableLimitError();
    }
  } else if (definition.kind === "bytes") {
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) throw variableLimitError();
  } else if (definition.kind === "string") {
    if (typeof value !== "string") throw variableLimitError();
  } else if (definition.kind === "filter") {
    validateFilterValue(value, 0, { ...limits, ...definition }, { nodes: 0 });
    return;
  }
  if (typeof value === "string" && Buffer.byteLength(value, "utf8") > definition.maxStringBytes) {
    throw variableLimitError();
  }
}

function validateVariables(variables, persisted) {
  const policy = persisted.variablePolicy;
  if (variables === undefined) {
    if (Object.values(policy.variables).some((definition) => definition.required)) throw variableLimitError();
    return;
  }
  if (!isPlainObject(variables)) throw variableLimitError();
  const serialized = JSON.stringify(variables);
  if (Buffer.byteLength(serialized, "utf8") > policy.maxPayloadBytes) throw variableLimitError();
  for (const name of Object.keys(variables)) {
    if (!Object.hasOwn(policy.variables, name)) throw new GatewayRefusal(400, "Undeclared GraphQL variable");
  }
  for (const [name, definition] of Object.entries(policy.variables)) {
    if (definition.required && !Object.hasOwn(variables, name)) throw variableLimitError();
    if (Object.hasOwn(variables, name)) validateScalarValue(variables[name], definition, policy);
  }
}

/**
 * The gateway's checks of one parsed request body, without the HTTP layer
 * (token, content type, body size, concurrency). Returns undefined when the
 * gateway would pass the request on, or the refusal it would send.
 *
 * @param {unknown} parsed the JSON body as the app's server sent it
 * @returns {GatewayRefusal | undefined}
 */
export function gatewayRefusal(parsed) {
  try {
    if (!isPlainObject(parsed)) throw new GatewayRefusal(400, "Request body must be a JSON object");
    const allowedKeys = new Set(["query", "variables", "operationName"]);
    if (Object.keys(parsed).some((key) => !allowedKeys.has(key))) {
      throw new GatewayRefusal(400, "Unsupported GraphQL request field");
    }
    if (typeof parsed.query !== "string" || parsed.query.length === 0) {
      throw new GatewayRefusal(400, "A GraphQL query is required");
    }
    if (Buffer.byteLength(parsed.query, "utf8") > MAX_QUERY_BYTES) {
      throw new GatewayRefusal(413, "GraphQL query is too large");
    }

    const approved = canonicalizeApprovedDocument(parsed.query);
    if (parsed.operationName !== undefined && parsed.operationName !== approved.operationName) {
      throw new GatewayRefusal(400, "Operation name does not match the query");
    }
    validateVariables(parsed.variables, PERSISTED_DOCUMENTS[approved.operationName]);
    return undefined;
  } catch (error) {
    if (error instanceof GatewayRefusal) return error;
    throw error;
  }
}
