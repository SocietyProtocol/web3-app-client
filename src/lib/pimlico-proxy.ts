import { isAddress, isAddressEqual, isHex, toHex } from "viem";
import { userOperationWithinCaps } from "@/lib/aa/limits";
import { aaRateLimits, clientIp } from "@/lib/aa/rate-limit";
import { verifyDeployedLightAccount } from "@/lib/aa/sender-check";
import {
  ENTRY_POINT_V07,
  SPONSORSHIP_POLICY_ID,
  UserOperationShape,
  badgesFunctionNames,
  supportedAaChainId,
  userOperationHasFactory,
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

const ERC7677_METHODS = new Set(["pm_getPaymasterData", "pm_getPaymasterStubData"]);

/** Paymaster calls that return a signature the sender can actually submit. */
const SIGNING_PAYMASTER_METHODS = new Set([
  "pm_sponsorUserOperation",
  "pm_getPaymasterData",
]);

/** EntryPoint 0.6 fields, plus 7702 delegation, which Light Account v2 never sends. */
const FOREIGN_USER_OPERATION_FIELDS = ["initCode", "paymasterAndData", "eip7702Auth"];

export type AaRpcReview = {
  kind: "paymaster" | "bundler" | "read";
  /** Sender of the UserOp, for paymaster and bundler methods. */
  sender?: string;
  /** No factory: the sender must already be a canonical Light Account on-chain. */
  needsDeployedSender: boolean;
  /** Paymaster call that signs an updateProfileURI sponsorship. */
  signsProfileUpdate: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Pure checks on one JSON-RPC request. On-chain sender checks and rate
 * limits happen in forwardAaRpc. Request shapes follow viem 2.x and
 * permissionless 0.4:
 *   pm_getPaymasterStubData / pm_getPaymasterData (ERC-7677):
 *     [userOp, entryPoint, chainIdHex, context]
 *   pm_sponsorUserOperation (Pimlico): [userOp, entryPoint, context?]
 *   eth_sendUserOperation: [userOp, entryPoint]
 *   eth_estimateUserOperationGas: [userOp, entryPoint, stateOverride?]
 */
export function reviewAaRpc(input: {
  chainId: number;
  request: unknown;
  policyId?: string;
}):
  | { ok: true; body: JsonRpcRequest; review: AaRpcReview }
  | { ok: false; message: string } {
  if (!supportedAaChainId(input.chainId)) {
    return { ok: false, message: "Unsupported chain" };
  }
  if (!isPlainObject(input.request)) {
    return { ok: false, message: "Expected one JSON-RPC request" };
  }

  const request = input.request as JsonRpcRequest;
  if (typeof request.method !== "string") {
    return { ok: false, message: "Missing method" };
  }
  const isPaymaster = PAYMASTER_METHODS.has(request.method);
  const isBundler = BUNDLER_METHODS.has(request.method);
  if (!isBundler && !isPaymaster && !READ_METHODS.has(request.method)) {
    return { ok: false, message: "Method is not available on this proxy" };
  }

  const params = Array.isArray(request.params) ? [...request.params] : [];
  const review: AaRpcReview = {
    kind: isPaymaster ? "paymaster" : isBundler ? "bundler" : "read",
    needsDeployedSender: false,
    signsProfileUpdate: false,
  };

  if (isBundler || isPaymaster) {
    const userOp = params[0];
    if (!isPlainObject(userOp)) {
      return { ok: false, message: "Missing user operation" };
    }
    if (FOREIGN_USER_OPERATION_FIELDS.some((field) => field in userOp)) {
      return { ok: false, message: "Only EntryPoint 0.7 user operations are accepted" };
    }
    const entryPoint = params[1];
    if (
      typeof entryPoint !== "string" ||
      !isAddress(entryPoint) ||
      !isAddressEqual(entryPoint, ENTRY_POINT_V07)
    ) {
      return { ok: false, message: "Only EntryPoint 0.7 is accepted" };
    }

    const op = userOp as UserOperationShape;
    const decision = isPaymaster
      ? userOperationIsSponsored(op, input.chainId)
      : userOperationMayRelay(op, input.chainId);
    if (!decision.ok) return { ok: false, message: decision.reason };

    // A paymaster-backed send carries the same gas the paymaster signed.
    if (isPaymaster || (request.method === "eth_sendUserOperation" && op.paymaster)) {
      const caps = userOperationWithinCaps(op, input.chainId);
      if (!caps.ok) return { ok: false, message: caps.reason };
    }

    review.sender = op.sender;
    review.needsDeployedSender = !userOperationHasFactory(op);
    review.signsProfileUpdate =
      SIGNING_PAYMASTER_METHODS.has(request.method) &&
      typeof op.callData === "string" &&
      isHex(op.callData) &&
      badgesFunctionNames(op.callData, input.chainId).includes("updateProfileURI");

    if (request.method === "eth_sendUserOperation") params.length = 2;
    if (request.method === "eth_estimateUserOperationGas" && params.length > 3) {
      params.length = 3;
    }
  }

  if (isPaymaster) {
    // The client context is dropped whole: only the server policy is sent.
    const context = { sponsorshipPolicyId: input.policyId || SPONSORSHIP_POLICY_ID };
    if (ERC7677_METHODS.has(request.method)) {
      const chainSlot = params[2];
      if (
        typeof chainSlot !== "string" ||
        chainSlot.toLowerCase() !== toHex(input.chainId)
      ) {
        return { ok: false, message: "Paymaster chain id does not match" };
      }
      params.length = 4;
      params[3] = context;
    } else {
      params.length = 3;
      params[2] = context;
    }
  }

  return {
    ok: true,
    body: {
      jsonrpc: "2.0",
      id: request.id ?? 1,
      method: request.method,
      params,
    },
    review,
  };
}

export function getPimlicoApiKey() {
  const key = process.env.PIMLICO_API_KEY;
  if (!key) return undefined;
  return key;
}

export function sponsorshipPolicyId() {
  return process.env.PIMLICO_SPONSORSHIP_POLICY_ID || SPONSORSHIP_POLICY_ID;
}

/** GET /api/aa/rpc. Health only: no key material. */
export function aaRpcHealth() {
  return Response.json(
    { configured: !!getPimlicoApiKey(), policy: sponsorshipPolicyId() },
    { headers: { "cache-control": "no-store" } },
  );
}

const RATE_LIMITED = -32005;

/** Rate limits, then the on-chain sender check. Order keeps RPC work behind the IP limit. */
async function admitAaRpc(
  request: Request,
  chainId: number,
  review: AaRpcReview,
): Promise<{ ok: true } | { ok: false; message: string; code: number }> {
  if (review.kind === "read") return { ok: true };

  const ip = clientIp(request.headers);
  const byIp =
    review.kind === "paymaster" ? aaRateLimits.paymasterByIp : aaRateLimits.bundlerByIp;
  if (!byIp.take(ip)) {
    return { ok: false, message: "Too many requests", code: RATE_LIMITED };
  }

  if (review.needsDeployedSender) {
    const sender = await verifyDeployedLightAccount(chainId, review.sender);
    if (!sender.ok) return { ok: false, message: sender.reason, code: -32602 };
  }

  if (review.kind === "paymaster") {
    const senderKey = `${chainId}:${String(review.sender).toLowerCase()}`;
    if (!aaRateLimits.paymasterBySender.take(senderKey)) {
      return { ok: false, message: "Too many sponsorship requests", code: RATE_LIMITED };
    }
    if (review.signsProfileUpdate && !aaRateLimits.profileUpdatesBySender.take(senderKey)) {
      return {
        ok: false,
        message: "Daily sponsored profile update limit reached",
        code: RATE_LIMITED,
      };
    }
  }
  return { ok: true };
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
    policyId: sponsorshipPolicyId(),
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

  const admitted = await admitAaRpc(request, chainId, reviewed.review);
  if (!admitted.ok) return jsonRpcError(requestId, admitted.message, admitted.code);

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
