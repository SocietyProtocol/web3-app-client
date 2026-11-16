import type { AaAnswer } from "./traffic";

/**
 * Answers that make a sponsored write fail, for `aa.answer(...)`.
 *
 * Two kinds, and they are not equally trustworthy:
 *
 *   - The proxy's own refusals are copies of what src/lib/pimlico-proxy.ts
 *     sends (jsonRpcError: HTTP 200 with a JSON-RPC error). The two rate
 *     limits are also produced for real by the local proxy and compared
 *     with these copies in features/api/aa-rpc.api.spec.ts, so a change of
 *     wording there fails a test here.
 *   - Pimlico's and the bundler's are MODELLED, not recorded: the local mock
 *     paymaster never refuses, and nobody captured the real answers. The
 *     app does not read their wording before the signature (any failure
 *     there falls back to the wallet paying), so the wording only matters
 *     for the after-signature cases, where utils/errors.ts matches the AAxx
 *     code. A `live` journey has to back these.
 */

const PAYMASTER_METHODS = ["pm_getPaymasterStubData", "pm_getPaymasterData", "pm_sponsorUserOperation"] as const;

/** JSON-RPC code of the proxy's rate limits (RATE_LIMITED in pimlico-proxy.ts). */
const RATE_LIMITED = -32005;

/** Refusals that reach the app before it asks the wallet to sign the user operation. */
export const REFUSALS = {
  /** Pimlico: the policy's budget is spent. Modelled. */
  policyExhausted: {
    methods: PAYMASTER_METHODS,
    error: {
      code: -32000,
      message: "sponsorship policy sp_eager_ricochet has reached its global spending limit",
    },
  },
  /** Pimlico: this sender used up the policy's per-user allowance. Modelled. */
  perUserLimit: {
    methods: PAYMASTER_METHODS,
    error: {
      code: -32000,
      message: "sponsorship policy sp_eager_ricochet: per-user operation limit reached for this sender",
    },
  },
  /** The proxy: more than ten paymaster calls a minute from one visitor. */
  visitorRateLimit: {
    methods: PAYMASTER_METHODS,
    error: { code: RATE_LIMITED, message: "Too many requests" },
  },
  /** The proxy: more than five paymaster calls a minute for one sender. */
  senderRateLimit: {
    methods: PAYMASTER_METHODS,
    error: { code: RATE_LIMITED, message: "Too many sponsorship requests" },
  },
  /**
   * The proxy: the sender's eleventh sponsored profile update of the day.
   * Only the call that signs the sponsorship is counted, so the stub call
   * before it and the gas estimate still go through.
   */
  dailyProfileUpdateLimit: {
    methods: ["pm_getPaymasterData", "pm_sponsorUserOperation"],
    error: { code: RATE_LIMITED, message: "Daily sponsored profile update limit reached" },
  },
  /**
   * The proxy: a visitor IP's second sponsored new account (createProfile)
   * of the day, with SPONSORED_PROFILES_PER_IP_PER_DAY at its default of 1.
   * Counted on the signing call only, like the profile updates.
   */
  dailyProfileCreateLimit: {
    methods: ["pm_getPaymasterData", "pm_sponsorUserOperation"],
    error: { code: RATE_LIMITED, message: "Daily sponsored profile limit reached" },
  },
  /**
   * The proxy: a sponsored new account less than
   * SPONSORED_PROFILE_INTERVAL_SECONDS (default 300) after the last one,
   * from any visitor.
   */
  appProfileCreateLimit: {
    methods: ["pm_getPaymasterData", "pm_sponsorUserOperation"],
    error: { code: RATE_LIMITED, message: "Sponsored profile limit reached, try again in a few minutes" },
  },
  /** The proxy without PIMLICO_API_KEY: every call, reads included. */
  notConfigured: {
    error: { code: -32603, message: "Sponsorship is not configured" },
  },
  /** A gateway in front of the app (Cloudflare) rate-limits the visitor: not JSON at all. Modelled. */
  gatewayRateLimit: {
    status: 429,
    body: "error code: 1015",
  },
} as const satisfies Record<string, AaAnswer>;

/**
 * The bundler rejecting a user operation that the wallet has already
 * signed (eth_sendUserOperation). Modelled on alto's wording; -32500 is
 * ERC-4337's "rejected by the EntryPoint's validation", -32501 its
 * "rejected by the paymaster".
 */
function bundlerRejection(code: number, reason: string): AaAnswer {
  return {
    methods: ["eth_sendUserOperation"],
    error: { code, message: `UserOperation reverted during simulation with reason: ${reason}` },
  };
}

export const BUNDLER_REJECTIONS = {
  prefundNotPaid: bundlerRejection(-32500, "AA21 didn't pay prefund"),
  signatureRejected: bundlerRejection(-32500, "AA24 signature error"),
  nonceInUse: bundlerRejection(-32500, "AA25 invalid account nonce"),
  paymasterSignatureRejected: bundlerRejection(-32501, "AA34 signature error"),
} as const satisfies Record<string, AaAnswer>;

/**
 * A lagging node behind the bundler still sees a just-deployed Light
 * Account as undeployed: the gas estimate is refused with AA10. Answer it
 * `times: 1` to see the app's retry.
 */
export const ALREADY_DEPLOYED: AaAnswer = {
  methods: ["eth_estimateUserOperationGas"],
  error: {
    code: -32500,
    message: "UserOperation reverted during simulation with reason: AA10 sender already constructed",
  },
};
