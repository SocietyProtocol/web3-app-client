// Settings of the hermetic stack, for the launcher (plain Node, no build
// step). The tests read the same values through e2e/env/hermetic.ts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const E2E_DIR = path.resolve(HERE, "..", "..");
export const REPO_DIR = path.resolve(E2E_DIR, "..");
export const AA_STACK_DIR = path.join(E2E_DIR, "aa-stack");

export const settings = JSON.parse(
  fs.readFileSync(path.join(E2E_DIR, "env", "hermetic.json"), "utf8"),
);

export const CHAIN_ID = settings.chainId;
export const HOST = "127.0.0.1";

// A run with several workers has one whole stack per worker: its own chain,
// bundler, paymaster, fakes and app server, all reading the one app build.
// Stack 0 is the only one in a run with one worker. Stack i uses every port
// of stack 0 plus i * portStep, and its own directory for logs and state.
/** The highest number of stacks, and so of workers. */
export const MAX_STACKS = settings.stacks.max;
const PORT_STEP = settings.stacks.portStep;
const BASE_PORTS = Object.fromEntries(
  Object.entries(settings.ports).filter(([name]) => !name.startsWith("_")),
);

function wholeNumber(name, raw, { min, max }) {
  if (!/^(0|[1-9][0-9]*)$/.test(raw) || Number(raw) < min || Number(raw) > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}, got "${raw}"`);
  }
  return Number(raw);
}

/** How many stacks `up` starts: E2E_WORKERS, or 1. */
export function stackCount() {
  const raw = process.env.E2E_WORKERS;
  return raw ? wholeNumber("E2E_WORKERS", raw, { min: 1, max: MAX_STACKS }) : 1;
}

export function stackPorts(index) {
  return Object.fromEntries(Object.entries(BASE_PORTS).map(([name, port]) => [name, port + index * PORT_STEP]));
}

export function stackUrls(index) {
  return Object.fromEntries(Object.entries(stackPorts(index)).map(([name, port]) => [name, `http://${HOST}:${port}`]));
}

/** Logs, the state file and other run output of one stack. Ignored by git. */
export function stackStateDir(index) {
  const root = path.join(E2E_DIR, ".stack");
  return index === 0 ? root : path.join(root, `stack-${index}`);
}

/**
 * Which stack this process is, or supervises: set by the supervisor of
 * stack 0 for the supervisors it starts (cli.mjs), 0 everywhere else.
 */
export const STACK_INDEX = process.env.E2E_STACK_INDEX
  ? wholeNumber("E2E_STACK_INDEX", process.env.E2E_STACK_INDEX, { min: 0, max: MAX_STACKS - 1 })
  : 0;

export const STATE_DIR = stackStateDir(STACK_INDEX);
export const LOG_DIR = path.join(STATE_DIR, "logs");
export const STATE_FILE = path.join(STATE_DIR, "state.json");
export const PORTS = stackPorts(STACK_INDEX);
export const URLS = stackUrls(STACK_INDEX);

export const TEST_MNEMONIC = settings.TEST_ONLY_MNEMONIC.phrase;
export const KEY_INDEX = settings.TEST_ONLY_MNEMONIC.indexes;
export const CONTRACTS = settings.contracts;
export const IPFS_GATEWAY = settings.ipfsGateway;

export const FORK_BLOCK = Number(process.env.E2E_FORK_BLOCK || settings.fork.block);
export const FORK_RPC_URL = process.env.E2E_FORK_RPC_URL || settings.fork.rpcUrl;

export function baselineFile(block = FORK_BLOCK) {
  return path.join(E2E_DIR, "support", "backends", "baseline", `sepolia-${block}.json`);
}

/** `auction.id` of hermetic.json as the build wants it: "" when there is none. */
function auctionIdForBuild() {
  const id = settings.auction?.id;
  if (id === null || id === undefined) return "";
  if (!Number.isInteger(id) || id < 1) throw new Error(`e2e/env/hermetic.json: auction.id must be a whole number above 0 or null, got ${JSON.stringify(id)}`);
  return String(id);
}

/**
 * Values compiled into the client bundle by `next build`. All are dummies:
 * the browser never reaches these hosts, because the tests intercept them.
 * Optional variables are set to "" so that a developer's own .env.local
 * cannot leak into the hermetic build.
 */
export const APP_BUILD_ENV = {
  NEXT_PUBLIC_ENVIRONMENT: "development",
  // The mark of the suite's own build (src/lib/e2e-build.ts). Every test
  // switch below, and every E2E_* override at runtime, is ignored without
  // it, so no deployment (staging is also built as "development") honours
  // them. Never set it in a deployment's env files.
  NEXT_PUBLIC_E2E_BUILD: "1",
  NEXT_PUBLIC_WC_PROJECT_ID: "e2e-hermetic-not-a-real-project-id",
  NEXT_PUBLIC_ALCHEMY_API_KEY: "e2e-hermetic-not-a-real-key",
  NEXT_PUBLIC_GRAPH_URL: "https://graph.invalid/graphql",
  NEXT_PUBLIC_SNAPSHOT_URL: "https://snapshot.invalid/#/s:e2e-society.eth",
  NEXT_PUBLIC_SNAPSHOT_SPEC_URL: "https://snapshot.invalid/#/s:e2e-spec.eth",
  NEXT_PUBLIC_AUCTION_ID: auctionIdForBuild(),
  NEXT_PUBLIC_HERO_VIDEO_URL: "",
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "",
  NEXT_PUBLIC_POSTHOG_HOST: "",
  // The app's fixed polling and retry waits, shortened for a chain that
  // mines at once (src/lib/e2e-timing.ts). Ignored by any build without the marker above.
  NEXT_PUBLIC_E2E_POLL_MS: "200",
  // Test wallets that the app treats as members from before smart accounts
  // (src/lib/e2e-legacy-accounts.ts). Ignored by any build without the marker.
  NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS: JSON.stringify(settings.legacyAccounts.pairs),
  NEXT_TELEMETRY_DISABLED: "1",
};

/** Server-only values for `next start`. Dummies, plus the local endpoints. */
export const APP_RUNTIME_ENV = {
  ...APP_BUILD_ENV,
  E2E_HERMETIC: "1",
  E2E_RPC_URL: URLS.anvil,
  E2E_PIMLICO_UPSTREAM_URL: URLS.paymaster,
  E2E_FILEBASE_ENDPOINT: URLS.s3,
  // Any non-empty value turns the proxy on; with the override it is not sent.
  PIMLICO_API_KEY: "e2e-hermetic-not-a-real-key",
  PIMLICO_SPONSORSHIP_POLICY_ID: "",
  GRAPH_QUERY_GATEWAY_URL: `${URLS.subgraph}/graphql`,
  GRAPH_QUERY_GATEWAY_TOKEN: "e2e-hermetic-not-a-real-token",
  FILEBASE_KEY: "e2e-hermetic-key",
  FILEBASE_SECRET: "e2e-hermetic-secret",
  FILEBASE_BUCKET: "e2e-hermetic-bucket",
  KUBO_API_URL: "",
  // The limits on sponsored profile creation (src/lib/aa/rate-limit.ts) are
  // off in the suite's app: their defaults (one per visitor IP a day, one
  // every five minutes app-wide) would refuse most of the tests that create
  // a profile, and the wallet would pay or the test fail. The tests of the
  // limits themselves start a second app server with real values
  // (e2e/support/app-variant.ts, `appEnv` in e2e/fixtures.ts).
  SPONSORED_PROFILES_PER_IP_PER_DAY: "0",
  SPONSORED_PROFILE_INTERVAL_SECONDS: "0",
  PORT: String(PORTS.app),
  HOSTNAME: HOST,
};

/** What a child process inherits from the shell: no project secrets. */
export function baseEnv() {
  const keep = ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "CI", "USER", "SHELL"];
  return Object.fromEntries(
    keep.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]),
  );
}
