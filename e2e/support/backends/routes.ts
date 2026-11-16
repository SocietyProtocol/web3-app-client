import type { BrowserContext, Route } from "@playwright/test";
import { BROWSER_RPC_HOST, IPFS_GATEWAY, URLS } from "../../env/hermetic";

/**
 * Network rules of a hermetic browser context. Nothing leaves the machine:
 *
 *   the app's own origin          continues; /api/ requests get this test's
 *                                 x-forwarded-for and cf-connecting-ip, which
 *                                 key the server's in-memory rate limits
 *   the bundle's RPC host         answered by the local Anvil fork (a test
 *                                 can make single reads fail or wait:
 *                                 network.failRpc / network.holdRpc)
 *   the IPFS gateway              answered by the S3 fake
 *   everything else               aborted and recorded: WalletConnect,
 *                                 PostHog, Coinbase, the hero video, fonts...
 *   WebSockets to other hosts     closed (the WalletConnect relay)
 */
export type HermeticNetwork = {
  /** URLs that were aborted because they are not part of the hermetic stack. */
  blocked: string[];
  /**
   * Makes the page's own chain reads fail: every JSON-RPC request of the
   * browser that matches is answered with an error instead of by Anvil,
   * until the returned handle is released. The wallet's requests and the
   * app server's requests do not pass through here.
   *
   *   const fault = network.failRpc({ method: "eth_call", dataIncludes: callData });
   */
  failRpc(match: RpcMatch): RpcFault;
  /**
   * Keeps the matching JSON-RPC requests of the browser unanswered until
   * the handle is released, to look at the page while a read is loading.
   * Release it within a few seconds: the app's client gives up on a request
   * after ten.
   */
  holdRpc(match: RpcMatch): RpcFault;
  /** Releases every fault that is still active. The fixture calls it after each test. */
  releaseRpcFaults(): void;
};

export type RpcMatch = {
  /** JSON-RPC method, e.g. "eth_call". */
  method: string;
  /**
   * Only requests whose call data contains this hex string, e.g. the
   * encoded call of one contract function. The app batches its reads into
   * Multicall3, so this is a substring match, not a prefix match.
   */
  dataIncludes?: string;
};

export type RpcFault = {
  /** How many requests it has caught so far. */
  hits(): number;
  /** Stops matching, and lets held requests through to Anvil. */
  release(): void;
};

type RpcCall = { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };

type ActiveFault = {
  kind: "fail" | "hold";
  match: RpcMatch;
  hits: number;
  released: Promise<void>;
  release: () => void;
};

const INJECTED_RPC_ERROR = { code: -32000, message: "e2e: this chain read was made to fail by the test" };

function callData(call: RpcCall): string {
  const first = Array.isArray(call.params) ? (call.params[0] as { data?: unknown; input?: unknown } | undefined) : undefined;
  const data = first?.data ?? first?.input;
  return typeof data === "string" ? data.toLowerCase() : "";
}

function matches(fault: ActiveFault, call: RpcCall): boolean {
  if (call.method !== fault.match.method) return false;
  if (fault.match.dataIncludes === undefined) return true;
  return callData(call).includes(fault.match.dataIncludes.toLowerCase().replace(/^0x/, ""));
}

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const ipfsGateway = new URL(IPFS_GATEWAY);
const CORS = { "access-control-allow-origin": "*" };

async function fulfillFromAnvil(route: Route, faults: Set<ActiveFault>) {
  const request = route.request();
  try {
    let body = request.postData() ?? "";
    if (faults.size > 0) {
      const answered = await applyRpcFaults(body, faults);
      if (answered.response !== undefined) {
        return await route.fulfill({
          status: 200,
          headers: { ...CORS, "content-type": "application/json" },
          body: answered.response,
        });
      }
      body = answered.forward;
    }
    const response = await fetch(URLS.anvil, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    await route.fulfill({
      status: response.status,
      headers: { ...CORS, "content-type": "application/json" },
      body: await response.text(),
    });
  } catch (error) {
    await route
      .fulfill({
        status: 502,
        headers: { ...CORS, "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32603, message: String(error) } }),
      })
      // The page is gone (the test ended while a request was held).
      .catch(() => undefined);
  }
}

/**
 * Applies the test's RPC faults to one request body (a single call or a
 * batch). Returns the body to forward to Anvil, or the whole response when
 * a call of it was made to fail. Held calls wait here.
 */
async function applyRpcFaults(
  body: string,
  faults: Set<ActiveFault>,
): Promise<{ forward: string; response?: undefined } | { response: string }> {
  let parsed: RpcCall | RpcCall[];
  try {
    parsed = JSON.parse(body) as RpcCall | RpcCall[];
  } catch {
    return { forward: body };
  }
  const calls = Array.isArray(parsed) ? parsed : [parsed];
  const caught = calls.map((call) => [...faults].find((fault) => matches(fault, call)));
  if (caught.every((fault) => fault === undefined)) return { forward: body };

  for (const fault of caught) if (fault) fault.hits += 1;
  await Promise.all(caught.map((fault) => (fault?.kind === "hold" ? fault.released : undefined)));
  if (caught.every((fault) => fault?.kind !== "fail")) return { forward: body };

  // Answer the failed calls here and the others from Anvil, in the request's order.
  const answers = await Promise.all(
    calls.map(async (call, index) => {
      if (caught[index]?.kind === "fail") {
        return { jsonrpc: "2.0", id: call.id ?? null, error: INJECTED_RPC_ERROR };
      }
      const response = await fetch(URLS.anvil, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(call),
      });
      return (await response.json()) as unknown;
    }),
  );
  return { response: JSON.stringify(Array.isArray(parsed) ? answers : answers[0]) };
}

async function fulfillFromS3(route: Route, url: URL) {
  const path = url.pathname.slice(ipfsGateway.pathname.length);
  try {
    const response = await fetch(`${URLS.s3}/ipfs${path}`);
    await route.fulfill({
      status: response.status,
      headers: { ...CORS, "content-type": response.headers.get("content-type") ?? "application/octet-stream" },
      body: Buffer.from(await response.arrayBuffer()),
    });
  } catch {
    await route.abort("failed");
  }
}

export async function installHermeticRoutes(
  context: BrowserContext,
  options: {
    testIp: string;
    /** The app server the page talks to: the stack's, or a test's second one (support/app-variant.ts). */
    appOrigin?: string;
  },
): Promise<HermeticNetwork> {
  const rpcFaults = new Set<ActiveFault>();
  const addRpcFault = (kind: ActiveFault["kind"], match: RpcMatch): RpcFault => {
    let resolveReleased!: () => void;
    const fault: ActiveFault = {
      kind,
      match,
      hits: 0,
      released: new Promise<void>((resolve) => (resolveReleased = resolve)),
      release: () => {
        rpcFaults.delete(fault);
        resolveReleased();
      },
    };
    rpcFaults.add(fault);
    return { hits: () => fault.hits, release: fault.release };
  };
  const network: HermeticNetwork = {
    blocked: [],
    failRpc: (match) => addRpcFault("fail", match),
    holdRpc: (match) => addRpcFault("hold", match),
    releaseRpcFaults: () => {
      for (const fault of [...rpcFaults]) fault.release();
    },
  };
  const appOrigin = options.appOrigin ?? new URL(URLS.app).origin;

  await context.route("**/*", async (route) => {
    const request = route.request();
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return route.continue();
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return route.continue();

    if (url.origin === appOrigin) {
      if (!url.pathname.startsWith("/api/")) return route.continue();
      return route.continue({
        headers: {
          ...request.headers(),
          "x-forwarded-for": options.testIp,
          "cf-connecting-ip": options.testIp,
        },
      });
    }
    if (url.host === BROWSER_RPC_HOST) {
      if (request.method() !== "POST") return route.fulfill({ status: 204, headers: CORS });
      return fulfillFromAnvil(route, rpcFaults);
    }
    if (url.host === ipfsGateway.host && url.pathname.startsWith(`${ipfsGateway.pathname}/`)) {
      return fulfillFromS3(route, url);
    }
    if (LOCAL_HOSTS.has(url.hostname)) {
      // Another local port: not part of the app. Refuse it rather than let a
      // test pass against something outside the stack.
      network.blocked.push(request.url());
      return route.abort("blockedbyclient");
    }
    network.blocked.push(request.url());
    return route.abort("blockedbyclient");
  });

  await context.routeWebSocket(/.*/, (socket) => {
    network.blocked.push(socket.url());
    void socket.close({ code: 1008, reason: "Blocked by the hermetic test network" });
  });

  return network;
}
