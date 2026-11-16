import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

vi.mock("server-only", () => ({}));

import { e2eHermeticEnabled, e2eOverride, e2eRequestSwitch } from "@/lib/e2e-overrides";
import { serverRpcUrl } from "@/lib/aa/sender-check";
import { aaUpstreamUrl } from "@/lib/pimlico-proxy";
import { filebaseClientConfig } from "@/lib/filebase";

const SEPOLIA = 11155111;
const LOCAL_RPC = "http://127.0.0.1:8545";
const LOCAL_BUNDLER = "http://127.0.0.1:4337";
const LOCAL_S3 = "http://127.0.0.1:9000";
const PUBLIC_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const PIMLICO_SEPOLIA = "https://api.pimlico.io/v2/11155111/rpc?apikey=pim_test_key";

/** `marker` is NEXT_PUBLIC_E2E_BUILD, the mark of the suite's own build. */
type Mode = { flag?: string; environment?: string; marker?: string };

/** Sets every override, then the three things that decide whether they count. */
function stubOverrides({ flag, environment, marker }: Mode) {
  vi.stubEnv("E2E_RPC_URL", LOCAL_RPC);
  vi.stubEnv("E2E_PIMLICO_UPSTREAM_URL", LOCAL_BUNDLER);
  vi.stubEnv("E2E_FILEBASE_ENDPOINT", LOCAL_S3);
  vi.stubEnv("E2E_HERMETIC", flag ?? "");
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment ?? "");
  vi.stubEnv("NEXT_PUBLIC_E2E_BUILD", marker ?? "");
}

const IGNORED: Array<[string, Mode]> = [
  ["the flag is absent", { environment: "development", marker: "1" }],
  ["the flag is absent and the environment is unset", {}],
  ["the flag is not exactly 1", { flag: "true", environment: "development", marker: "1" }],
  ["the flag is 0", { flag: "0", environment: "development", marker: "1" }],
  ["the environment is production", { flag: "1", environment: "production", marker: "1" }],
  ["the environment is staging", { flag: "1", environment: "staging", marker: "1" }],
  ["the environment is unset", { flag: "1", marker: "1" }],
  // What a deployed staging server would be with the flag set by mistake:
  // staging is built as "development", but never with the build marker.
  ["the build marker is absent", { flag: "1", environment: "development" }],
  ["the build marker is not exactly 1", { flag: "1", environment: "development", marker: "true" }],
];

const HONOURED: Array<[string, Mode]> = [
  ["the suite's build", { flag: "1", environment: "development", marker: "1" }],
];

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "");
  vi.stubEnv("FILEBASE_KEY", "key");
  vi.stubEnv("FILEBASE_SECRET", "secret");
  vi.stubEnv("FILEBASE_BUCKET", "bucket");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("e2eOverride", () => {
  it.each(IGNORED)("ignores every override when %s", (_, mode) => {
    stubOverrides(mode);
    expect(e2eHermeticEnabled()).toBe(false);
    expect(e2eOverride("E2E_RPC_URL")).toBeUndefined();
    expect(e2eOverride("E2E_PIMLICO_UPSTREAM_URL")).toBeUndefined();
    expect(e2eOverride("E2E_FILEBASE_ENDPOINT")).toBeUndefined();
  });

  it.each(HONOURED)("returns the overrides with the flag on in %s", (_, mode) => {
    stubOverrides(mode);
    expect(e2eHermeticEnabled()).toBe(true);
    expect(e2eOverride("E2E_RPC_URL")).toBe(LOCAL_RPC);
    expect(e2eOverride("E2E_PIMLICO_UPSTREAM_URL")).toBe(LOCAL_BUNDLER);
    expect(e2eOverride("E2E_FILEBASE_ENDPOINT")).toBe(LOCAL_S3);
  });

  it("treats an empty override as unset", () => {
    stubOverrides({ flag: "1", environment: "development", marker: "1" });
    vi.stubEnv("E2E_RPC_URL", "");
    expect(e2eOverride("E2E_RPC_URL")).toBeUndefined();
    expect(serverRpcUrl(SEPOLIA)).toBe(PUBLIC_SEPOLIA_RPC);
  });
});

describe("e2eRequestSwitch", () => {
  const withCookie = (cookie: string) =>
    new Request("http://127.0.0.1/api/aa/first-badge", { headers: { cookie } });

  it.each(IGNORED)("is off whatever the request carries when %s", (_, mode) => {
    stubOverrides(mode);
    expect(e2eRequestSwitch(withCookie("e2e-sponsor-first-badge=1"), "e2e-sponsor-first-badge")).toBe(false);
  });

  it.each(HONOURED)("reads the cookie in %s", (_, mode) => {
    stubOverrides(mode);
    expect(e2eRequestSwitch(withCookie("a=b; e2e-sponsor-first-badge=1"), "e2e-sponsor-first-badge")).toBe(true);
    expect(e2eRequestSwitch(withCookie("e2e-sponsor-first-badge=0"), "e2e-sponsor-first-badge")).toBe(false);
    expect(e2eRequestSwitch(withCookie(""), "e2e-sponsor-first-badge")).toBe(false);
  });
});

describe("modules that take an override", () => {
  it.each(IGNORED)("keep the real endpoints when %s", (_, mode) => {
    stubOverrides(mode);
    expect(serverRpcUrl(SEPOLIA)).toBe(PUBLIC_SEPOLIA_RPC);
    expect(aaUpstreamUrl(SEPOLIA, "pim_test_key")).toBe(PIMLICO_SEPOLIA);
    const s3 = filebaseClientConfig();
    expect(s3.endpoint).toBe("https://s3.filebase.com");
    expect("forcePathStyle" in s3).toBe(false);
  });

  it.each(HONOURED)("use the local endpoints with the flag on in %s", (_, mode) => {
    stubOverrides(mode);
    expect(serverRpcUrl(SEPOLIA)).toBe(LOCAL_RPC);
    // The API key is not appended to the local upstream.
    expect(aaUpstreamUrl(SEPOLIA, "pim_test_key")).toBe(LOCAL_BUNDLER);
    expect(filebaseClientConfig()).toMatchObject({
      endpoint: LOCAL_S3,
      forcePathStyle: true,
    });
  });

  it("keeps the Alchemy endpoint when the flag is off and a key is set", () => {
    stubOverrides({ environment: "development" });
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "alchemy_test_key");
    expect(serverRpcUrl(SEPOLIA)).toBe(
      "https://eth-sepolia.g.alchemy.com/v2/alchemy_test_key",
    );
  });
});

describe("verifyAuth chain reads", () => {
  /**
   * A well-formed signature by some other key: the EOA check fails, so
   * verifyAuth asks the chain whether the address is a contract wallet.
   */
  async function rpcUrlsUsedByVerifyAuth(mode: Mode) {
    stubOverrides(mode);
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "alchemy_test_key");
    vi.stubEnv("NEXT_PUBLIC_WC_PROJECT_ID", "test");
    vi.stubEnv("NEXT_PUBLIC_SNAPSHOT_URL", "https://example.test/a");
    vi.stubEnv("NEXT_PUBLIC_SNAPSHOT_SPEC_URL", "https://example.test/b");
    vi.stubEnv("NEXT_PUBLIC_GRAPH_URL", "https://example.test/graphql");
    // lib/env refuses to load without an environment name.
    if (!mode.environment) vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "development");

    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        urls.push(typeof input === "string" ? input : String((input as Request).url ?? input));
        const { id } = JSON.parse(String(init?.body ?? "{}")) as { id?: number };
        return Response.json({ jsonrpc: "2.0", id: id ?? 1, result: "0x" });
      }),
    );

    vi.resetModules();
    const { generateAuthMessage, verifyAuth } = await import("@/lib/auth");
    const claimed = privateKeyToAccount(generatePrivateKey()).address;
    const timestamp = Date.now();
    const message = generateAuthMessage(claimed, timestamp);
    const signature = await privateKeyToAccount(generatePrivateKey()).signMessage({
      message,
    });
    const result = await verifyAuth({ address: claimed, message, signature, timestamp });
    expect(result).toEqual({ valid: false, error: "Invalid signature" });
    expect(urls.length).toBeGreaterThan(0);
    // viem may hand fetch a Request, which normalises the URL.
    return [...new Set(urls.map((url) => new URL(url).href))];
  }

  it("go to the override with the flag on", async () => {
    expect(
      await rpcUrlsUsedByVerifyAuth({ flag: "1", environment: "development", marker: "1" }),
    ).toEqual([new URL(LOCAL_RPC).href]);
  });

  it("go to Alchemy when the flag is absent", async () => {
    expect(await rpcUrlsUsedByVerifyAuth({ environment: "development" })).toEqual([
      "https://eth-sepolia.g.alchemy.com/v2/alchemy_test_key",
    ]);
  });

  it("go to Alchemy in production even with the flag on", async () => {
    expect(
      await rpcUrlsUsedByVerifyAuth({ flag: "1", environment: "production", marker: "1" }),
    ).toEqual(["https://eth-mainnet.g.alchemy.com/v2/alchemy_test_key"]);
  });

  it("go to Alchemy in a deployment built without the marker, even with the flag on", async () => {
    expect(
      await rpcUrlsUsedByVerifyAuth({ flag: "1", environment: "development" }),
    ).toEqual(["https://eth-sepolia.g.alchemy.com/v2/alchemy_test_key"]);
  });
});
