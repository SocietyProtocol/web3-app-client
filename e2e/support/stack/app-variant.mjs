// A second `next start` of the suite's build, with server settings of its
// own, for the tests of one stack (e2e/support/app-variant.ts starts it).
//
//   E2E_STACK_INDEX=<i> E2E_APP_VARIANT_ENV='{"NAME":"value"}' node app-variant.mjs
//
// It serves the build in .next on the stack's `appVariant` port, with the
// same runtime environment as the stack's own app (APP_RUNTIME_ENV) plus the
// given values, so it talks to the same chain, bundler, paymaster and fakes.
// Only server-side values can be given: anything compiled into the bundle
// (NEXT_PUBLIC_*) is fixed by the build, and the E2E_* overrides are the
// stack's. It stops on SIGTERM or SIGINT, and by itself within a second
// when the process that started it (a Playwright worker) is gone, so a
// killed run does not leave it listening.
import path from "node:path";
import { APP_RUNTIME_ENV, PORTS, REPO_DIR, HOST, baseEnv } from "./config.mjs";
import { ProcessGroup } from "./processes.mjs";

function overrides() {
  const raw = process.env.E2E_APP_VARIANT_ENV ?? "{}";
  const values = JSON.parse(raw);
  for (const [name, value] of Object.entries(values)) {
    if (typeof value !== "string") throw new Error(`E2E_APP_VARIANT_ENV: ${name} must be a string`);
    if (name.startsWith("NEXT_PUBLIC_") || name.startsWith("E2E_") || name === "PORT" || name === "HOSTNAME") {
      throw new Error(`E2E_APP_VARIANT_ENV: ${name} cannot be changed for a second app server`);
    }
  }
  return values;
}

const parent = process.ppid;
const group = new ProcessGroup();
const nextCli = path.join(REPO_DIR, "node_modules", "next", "dist", "bin", "next");
const port = PORTS.appVariant;
const entry = group.launch("app-variant", process.execPath, [nextCli, "start", "--port", String(port), "--hostname", HOST], {
  cwd: REPO_DIR,
  env: {
    ...baseEnv(),
    ...APP_RUNTIME_ENV,
    ...overrides(),
    PORT: String(port),
    NODE_ENV: "production",
  },
});

let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await group.stop();
  process.exit(code);
}

process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
entry.child.once("exit", () => void stop(1));
setInterval(() => {
  try {
    process.kill(parent, 0);
  } catch {
    void stop();
  }
  if (process.ppid !== parent) void stop();
}, 500);
