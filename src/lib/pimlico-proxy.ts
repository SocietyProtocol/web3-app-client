import {
  SPONSORSHIP_POLICY_ID,
  supportedAaChainId,
  userOperationIsSponsored,
  userOperationMayRelay,
} from "@/lib/smart-account";

const PAYMASTER_METHODS = new Set([
  "pm_sponsorUserOperation",
  "pm_getPaymasterData",
  "pm_getPaymasterStubData",
]);

const BUNDLER_METHODS = new Set([
  "eth_sendUserOperation",
  "eth_estimateUserOperationGas",
]);

const READ_METHODS = new Set([
  "eth_getUserOperationReceipt",
  "eth_getUserOperationByHash",
  "eth_supportedEntryPoints",
  "eth_chainId",
  "pimlico_getUserOperationGasPrice",
  "pimlico_getUserOperationStatus",
]);

const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 20_000;

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: unknown;
  method: string;
  params?: unknown[];
};

export function aaRpcUrl(chainId: number) {
  return `/api/aa/rpc?chainId=${chainId}`;
}

export function pimlicoRpcUrl(chainId: number, apiKey: string) {
  const url = new URL(`https://api.pimlico.io/v2/${chainId}/rpc`);
  url.searchParams.set("apikey", apiKey);
  return url.toString();
}

export function reviewAaRpc(input: {
  chainId: number;
  request: unknown;
  policyId?: string;
}): { ok: true; body: JsonRpcRequest } | { ok: false; message: string } {
  if (!supportedAaChainId(input.chainId)) {
    return { ok: false, message: "Unsupported chain" };
  }
  if (!input.request || typeof input.request !== "object" || Array.isArray(input.request)) {
    return { ok: false, message: "Expected one JSON-RPC request" };
  }

  const request = input.request as JsonRpcRequest;
  if (typeof request.method !== "string") {
    return { ok: false, message: "Missing method" };
  }
  if (
    !BUNDLER_METHODS.has(request.method) &&
    !PAYMASTER_METHODS.has(request.method) &&
    !READ_METHODS.has(request.method)
  ) {
    return { ok: false, message: "Method is not available on this proxy" };
  }

  const params = Array.isArray(request.params) ? [...request.params] : [];
  if (BUNDLER_METHODS.has(request.method) || PAYMASTER_METHODS.has(request.method)) {
    const userOp = params[0];
    if (!userOp || typeof userOp !== "object") {
      return { ok: false, message: "Missing user operation" };
    }
    const decision = PAYMASTER_METHODS.has(request.method)
      ? userOperationIsSponsored(userOp, input.chainId)
      : userOperationMayRelay(userOp, input.chainId);
    if (!decision.ok) return { ok: false, message: decision.reason };
  }

  if (PAYMASTER_METHODS.has(request.method)) {
    const context =
      params[2] && typeof params[2] === "object" && !Array.isArray(params[2])
        ? { ...(params[2] as Record<string, unknown>) }
        : {};
    context.sponsorshipPolicyId = input.policyId || SPONSORSHIP_POLICY_ID;
    params[2] = context;
  }

  return {
    ok: true,
    body: {
      jsonrpc: "2.0",
      id: request.id ?? 1,
      method: request.method,
      params,
    },
  };
}

export function getPimlicoApiKey() {
  const key = process.env.PIMLICO_API_KEY;
  if (!key) return undefined;
  return key;
}

export function jsonRpcError(id: unknown, message: string, code = -32602) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

export async function forwardAaRpc(request: Request) {
  const url = new URL(request.url);
  const chainId = Number(url.searchParams.get("chainId"));
  let raw = "";
  try {
    const declared = request.headers.get("content-length");
    if (declared && Number(declared) > MAX_BODY_BYTES) {
      return jsonRpcError(null, "Request is too large");
    }
    raw = await request.text();
  } catch {
    return jsonRpcError(null, "Could not read the request");
  }
  if (raw.length > MAX_BODY_BYTES) {
    return jsonRpcError(null, "Request is too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return jsonRpcError(null, "Invalid JSON");
  }

  const reviewed = reviewAaRpc({
    chainId,
    request: parsed,
    policyId: process.env.PIMLICO_SPONSORSHIP_POLICY_ID || SPONSORSHIP_POLICY_ID,
  });
  const requestId =
    parsed && typeof parsed === "object" && "id" in parsed
      ? (parsed as { id?: unknown }).id
      : null;
  if (!reviewed.ok) return jsonRpcError(requestId, reviewed.message);

  const apiKey = getPimlicoApiKey();
  if (!apiKey) {
    return jsonRpcError(requestId, "Sponsorship is not configured", -32603);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(pimlicoRpcUrl(chainId, apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(reviewed.body),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return jsonRpcError(requestId, "Sponsorship provider did not respond", -32603);
  } finally {
    clearTimeout(timer);
  }
}
