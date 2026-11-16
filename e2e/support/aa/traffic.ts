import type { BrowserContext, Request, Route } from "@playwright/test";
import { decodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";

/**
 * What the page sent to the app's account-abstraction proxy, /api/aa/rpc:
 * the paymaster and bundler calls of a sponsored write, and what came back.
 * The requests go on to the real proxy untouched, unless the test answers
 * some of them itself with `answer()` (a refusal the local stack cannot
 * produce: see refusals.ts).
 *
 * The wallet's request log says what the user was asked to approve; this
 * says what the app then submitted. A test of a sponsored write can check,
 * for example, that the first user operation of a new user carries the
 * Light Account factory and a later one does not.
 */
export type AaCall = {
  method: string;
  params: unknown[];
  at: number;
  /** The JSON-RPC error the call was answered with, once the answer is in. */
  error?: { code: number; message: string };
  /** HTTP status of the answer, once it is in. */
  status?: number;
};

/**
 * An answer a test gives in place of the proxy: a JSON-RPC error (HTTP 200,
 * as the proxy and Pimlico send them) or, with `body`, any other response
 * (a gateway's 429 page).
 */
export type AaAnswer = {
  /** JSON-RPC methods to answer. Left out: every call to the proxy. */
  methods?: readonly string[];
  error?: { code: number; message: string; data?: unknown };
  /** HTTP status; 200 when left out. */
  status?: number;
  /** A body that is not a JSON-RPC reply, sent as text/plain. */
  body?: string;
};

export type AaFault = {
  /** How many calls it has answered so far. */
  hits(): number;
  /** The methods of those calls, in order. */
  methods(): string[];
  /** Stops answering: later calls reach the real proxy again. */
  lift(): Promise<void>;
};

/** A user operation as the page submitted it (EntryPoint 0.7 JSON-RPC form). */
export type SentUserOperation = {
  sender: Address;
  nonce: Hex;
  callData: Hex;
  /** Present only when the operation deploys its sender. */
  factory?: Address;
  factoryData?: Hex;
  paymaster?: Address;
  paymasterData?: Hex;
  signature: Hex;
  [field: string]: unknown;
};

type Answer = { status: number; error?: { code: number; message: string } };

const isProxy = (url: URL) => url.pathname === "/api/aa/rpc";

const PAYMASTER_METHODS = new Set(["pm_getPaymasterStubData", "pm_getPaymasterData", "pm_sponsorUserOperation"]);

// Light Account v2: execute(dest, value, func).
const EXECUTE_ABI = parseAbi(["function execute(address dest, uint256 value, bytes func)"]);

export class AaTraffic {
  /** Every JSON-RPC call the page made to /api/aa/rpc, in order. */
  readonly calls: AaCall[] = [];

  private context?: BrowserContext;
  /** The recorded call of each single-call request, to put its answer on. */
  private readonly entries = new WeakMap<Request, AaCall>();
  /** Answers that came in before the request event had recorded the call. */
  private readonly early = new WeakMap<Request, Answer>();

  /**
   * Starts recording the requests of every page of the context, and their
   * answers. The answers are read where the request is routed, not from
   * the page's response: Chromium does not always keep the body of a
   * response for later reading (under load, "No data found for resource"),
   * and a refusal would then go unrecorded.
   *
   * `testIp` is the address the network rules (backends/routes.ts) give
   * the app's API requests; this route is asked before them, so it sends
   * the same headers.
   */
  async attach(context: BrowserContext, options: { testIp: string }) {
    this.context = context;
    context.on("request", (request) => {
      if (request.method() !== "POST") return;
      let url: URL;
      try {
        url = new URL(request.url());
      } catch {
        return;
      }
      if (!isProxy(url)) return;
      let body: unknown;
      try {
        body = JSON.parse(request.postData() ?? "");
      } catch {
        return;
      }
      for (const call of Array.isArray(body) ? body : [body]) {
        const { method, params } = (call ?? {}) as { method?: unknown; params?: unknown };
        if (typeof method !== "string") continue;
        const entry: AaCall = { method, params: Array.isArray(params) ? params : [], at: Date.now() };
        this.calls.push(entry);
        // The app sends one call per request, so the answer belongs to it.
        if (Array.isArray(body)) continue;
        this.entries.set(request, entry);
        const answer = this.early.get(request);
        if (answer) Object.assign(entry, answer);
      }
    });
    await context.route(isProxy, async (route) => {
      const request = route.request();
      if (request.method() !== "POST") return route.fallback();
      const response = await route.fetch({
        headers: {
          ...request.headers(),
          "x-forwarded-for": options.testIp,
          "cf-connecting-ip": options.testIp,
        },
        maxRedirects: 0,
        timeout: 0,
      });
      let error: Answer["error"];
      try {
        const reply = JSON.parse((await response.body()).toString("utf8")) as { error?: Answer["error"] };
        if (reply && !Array.isArray(reply) && reply.error) {
          error = { code: reply.error.code, message: reply.error.message };
        }
      } catch {
        // Not JSON: a gateway's page, or no body.
      }
      this.recordAnswer(request, { status: response.status(), ...(error ? { error } : {}) });
      await route.fulfill({ response });
    });
  }

  private recordAnswer(request: Request, answer: Answer) {
    const entry = this.entries.get(request);
    if (entry) Object.assign(entry, answer);
    else this.early.set(request, answer);
  }

  /**
   * Answers the page's calls to /api/aa/rpc in place of the proxy: all of
   * them, or those of `answer.methods`, `times` times or until the returned
   * fault is lifted. The calls are still recorded in `calls`. Use it for
   * refusals the local stack cannot produce (see refusals.ts); what the
   * local proxy does refuse by itself needs no stub.
   *
   *   const refusal = await aa.answer(REFUSALS.policyExhausted);
   *   ...
   *   expect(refusal.hits()).toBeGreaterThan(0);
   */
  async answer(answer: AaAnswer, options: { times?: number } = {}): Promise<AaFault> {
    const context = this.context;
    if (!context) throw new Error("AaTraffic.answer: attach(context) first");
    const methods = answer.methods ? new Set(answer.methods) : undefined;
    const answered: string[] = [];
    let remaining = options.times ?? Number.POSITIVE_INFINITY;
    const handler = async (route: Route) => {
      const request = route.request();
      if (request.method() !== "POST" || remaining <= 0) return route.fallback();
      let call: { id?: unknown; method?: unknown } | undefined;
      try {
        call = JSON.parse(request.postData() ?? "") as { id?: unknown; method?: unknown };
      } catch {
        return route.fallback();
      }
      if (!call || Array.isArray(call) || typeof call.method !== "string") return route.fallback();
      if (methods && !methods.has(call.method)) return route.fallback();
      remaining -= 1;
      answered.push(call.method);
      this.recordAnswer(request, {
        status: answer.status ?? 200,
        ...(answer.body === undefined && answer.error
          ? { error: { code: answer.error.code, message: answer.error.message } }
          : {}),
      });
      if (answer.body !== undefined) {
        return route.fulfill({ status: answer.status ?? 200, contentType: "text/plain", body: answer.body });
      }
      return route.fulfill({
        status: answer.status ?? 200,
        contentType: "application/json",
        headers: { "cache-control": "no-store" },
        body: JSON.stringify({ jsonrpc: "2.0", id: call.id ?? null, error: answer.error }),
      });
    };
    // Registered after the context's network rules, so it is asked first;
    // what it does not answer falls back to them.
    await context.route(isProxy, handler);
    return {
      hits: () => answered.length,
      methods: () => [...answered],
      lift: () => context.unroute(isProxy, handler),
    };
  }

  clear() {
    this.calls.length = 0;
  }

  methods(): string[] {
    return this.calls.map((call) => call.method);
  }

  callsOf(...methods: string[]): AaCall[] {
    return this.calls.filter((call) => methods.includes(call.method));
  }

  /** The user operations the page submitted to the bundler (eth_sendUserOperation). */
  userOperations(): SentUserOperation[] {
    return this.callsOf("eth_sendUserOperation").map((call) => call.params[0] as SentUserOperation);
  }

  /** The page's requests for sponsorship (pm_*). The proxy allows five a minute per sender. */
  paymasterCalls(): AaCall[] {
    return this.calls.filter((call) => PAYMASTER_METHODS.has(call.method));
  }

  /** The calls that were answered with a JSON-RPC error, by the proxy or by `answer()`. */
  refusedCalls(): AaCall[] {
    return this.calls.filter((call) => call.error !== undefined);
  }
}

/** Whether a submitted user operation deploys its sender (carries a factory). */
export function deploysSender(userOperation: SentUserOperation): boolean {
  const { factory } = userOperation;
  return !!factory && factory !== "0x";
}

/**
 * The badges-contract call a user operation makes through the Light
 * Account's execute: where it goes, the function and its arguments.
 */
export function badgesCallOf(userOperation: SentUserOperation): {
  to: Address;
  value: bigint;
  functionName: string;
  args: readonly unknown[];
} {
  const [to, value, data] = decodeFunctionData({ abi: EXECUTE_ABI, data: userOperation.callData }).args;
  const inner = decodeFunctionData({ abi: SocietyProtocolBadgesABI, data: data });
  return { to, value, functionName: inner.functionName, args: (inner.args ?? []) as readonly unknown[] };
}
