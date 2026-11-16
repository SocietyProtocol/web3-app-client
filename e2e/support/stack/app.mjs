// Builds the app once (`next build`) with dummy public values and serves it
// with `next start`, pointed at the local chain, bundler and fakes.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { APP_BUILD_ENV, APP_RUNTIME_ENV, HOST, PORTS, REPO_DIR, URLS, baseEnv } from "./config.mjs";
import { run, waitFor } from "./processes.mjs";

const STAMP_FILE = path.join(REPO_DIR, ".next", "e2e-build-stamp");
/** Everything that can change what `next build` produces. */
const BUILD_INPUT_DIRS = ["src", "public"];
const BUILD_INPUT_FILES = [
  "package.json",
  "yarn.lock",
  "next.config.ts",
  "tsconfig.json",
  "schema.graphql",
  ".graphclientrc.yml",
  "scripts/generate-persisted-graphql.mjs",
];

function hashTree(hash, dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) hashTree(hash, full);
    else if (entry.isFile()) {
      hash.update(path.relative(REPO_DIR, full));
      hash.update(fs.readFileSync(full));
    }
  }
}

/** A fingerprint of the sources and build-time values. Same stamp, same build. */
export function buildStamp() {
  const hash = createHash("sha256");
  for (const dir of BUILD_INPUT_DIRS) {
    const full = path.join(REPO_DIR, dir);
    if (fs.existsSync(full)) hashTree(hash, full);
  }
  for (const file of BUILD_INPUT_FILES) {
    const full = path.join(REPO_DIR, file);
    hash.update(file);
    if (fs.existsSync(full)) hash.update(fs.readFileSync(full));
  }
  hash.update(JSON.stringify(APP_BUILD_ENV));
  return hash.digest("hex").slice(0, 16);
}

function builtStamp() {
  try {
    if (!fs.existsSync(path.join(REPO_DIR, ".next", "BUILD_ID"))) return undefined;
    return fs.readFileSync(STAMP_FILE, "utf8").trim();
  } catch {
    return undefined;
  }
}

function bin(name) {
  const file = path.join(REPO_DIR, "node_modules", ".bin", name);
  if (!fs.existsSync(file)) {
    throw new Error(`${name} is not installed. Run \`yarn install --frozen-lockfile\` in the repository root first.`);
  }
  return file;
}

/**
 * Makes sure .next holds a production build of the current sources.
 * Skipped when the stamp matches (set E2E_FORCE_BUILD=1 to rebuild anyway).
 *
 * With `build: false` nothing is ever built: the stack is one of several
 * that serve the same build, and the first of them has just made sure of
 * it. Two builds at once would write the same .next directory.
 */
export async function ensureBuild({ onChild, build = true } = {}) {
  const stamp = buildStamp();
  if (!build) {
    if (builtStamp() !== stamp) {
      throw new Error("The app build is missing or older than the app sources, and this stack does not build.");
    }
    return { stamp, built: false, ms: 0 };
  }
  if (process.env.E2E_FORCE_BUILD !== "1" && builtStamp() === stamp) {
    return { stamp, built: false, ms: 0 };
  }
  const started = Date.now();
  const env = { ...baseEnv(), ...APP_BUILD_ENV, NODE_OPTIONS: "--max-old-space-size=4096" };
  const options = { cwd: REPO_DIR, env, onChild };
  // The same three steps as `yarn build`, without needing yarn on the PATH.
  await run("app-codegen-persisted", process.execPath, ["scripts/generate-persisted-graphql.mjs"], options);
  await run("app-codegen-graphclient", bin("graphclient"), ["build"], {
    ...options,
    env: { ...env, GRAPHCLIENT_CODEGEN: "1" },
  });
  await run("app-build", bin("next"), ["build", "--webpack"], options);
  fs.writeFileSync(STAMP_FILE, `${stamp}\n`);
  return { stamp, built: true, ms: Date.now() - started };
}

/** Starts `next start` in `group` and waits until the AA proxy reports it is on. */
export async function startApp(group) {
  const nextCli = path.join(REPO_DIR, "node_modules", "next", "dist", "bin", "next");
  const entry = group.launch(
    "app",
    process.execPath,
    [nextCli, "start", "--port", String(PORTS.app), "--hostname", HOST],
    { cwd: REPO_DIR, env: { ...baseEnv(), ...APP_RUNTIME_ENV, NODE_ENV: "production" } },
  );
  const { ms } = await waitFor(
    "the app (next start)",
    async () => {
      const response = await fetch(`${URLS.app}/api/aa/rpc`, { signal: AbortSignal.timeout(3_000) });
      if (!response.ok) return false;
      const health = await response.json();
      if (health.configured !== true) {
        throw new Error("the AA proxy reports it is not configured");
      }
      return true;
    },
    { timeoutMs: 90_000, entry },
  );
  const warmStarted = Date.now();
  await warmUp();
  return { ms, warmUpMs: Date.now() - warmStarted };
}

/**
 * The first request to a route makes the server load that route's code,
 * and the first server-side subgraph query loads the whole Graph Client.
 * On a busy machine that takes long enough to time out a test's first
 * navigation, so pay for it here, once.
 */
const WARM_UP_ROUTES = [
  "/",
  "/profile",
  "/accounts",
  "/badges",
  "/badges/1",
  "/communities",
  "/communities/1",
  "/governance",
  "/auction",
  "/spec-token",
  "/user/0x0000000000000000000000000000000000000001",
  "/api/copywriting/governance",
];

async function warmUp() {
  for (const route of WARM_UP_ROUTES) {
    try {
      const response = await fetch(`${URLS.app}${route}`, { signal: AbortSignal.timeout(120_000) });
      await response.arrayBuffer();
    } catch {
      // A route that fails here fails in a test too, with a better message.
    }
  }
}
