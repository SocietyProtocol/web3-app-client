import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { PORTS, STACK_INDEX, STACK_LOG_DIR, URLS } from "../env/hermetic";

/**
 * A second app server for one test: the suite's build, the stack's chain,
 * bundler, paymaster and fakes, and server settings of the test's own
 * (`test.use({ appEnv: { ... } })`, see e2e/fixtures.ts). For behaviour that
 * the stack's app has turned off because it would get in the way of the
 * other tests, such as the limits on sponsored profile creation.
 *
 * It listens on the stack's `appVariant` port, so the workers of a run do
 * not collide, and it starts with empty in-memory counts: every test that
 * uses it has a fresh server.
 */
export type AppVariant = {
  url: string;
  /** The last lines of its log, for a failed test's report. */
  log: () => string;
  stop: () => Promise<void>;
};

const SCRIPT = path.join(__dirname, "stack", "app-variant.mjs");
export const APP_VARIANT_LOG = path.join(STACK_LOG_DIR, "app-variant.log");

function portInUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (value: boolean) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1_000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function lastLines(file: string, lines = 60) {
  try {
    return fs.readFileSync(file, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

function exited(child: ChildProcess) {
  return child.exitCode !== null || child.signalCode !== null;
}

/**
 * The routes a test of the variant opens: the first request to each makes
 * the server load its code, which on a busy machine can take long enough to
 * time out a navigation (the stack's app is warmed up the same way).
 */
const WARM_UP_ROUTES = ["/", "/profile"];

export async function startAppVariant(env: Record<string, string>): Promise<AppVariant> {
  if (await portInUse(PORTS.appVariant)) {
    throw new Error(
      `Port ${PORTS.appVariant} (the second app server of stack ${STACK_INDEX}) is already in use: ` +
        "an earlier one was left running. Find it with `lsof -nP -iTCP:" +
        `${PORTS.appVariant} -sTCP:LISTEN\` and stop it.`,
    );
  }
  const child = spawn(process.execPath, [SCRIPT], {
    stdio: "ignore",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
      E2E_STACK_INDEX: String(STACK_INDEX),
      E2E_APP_VARIANT_ENV: JSON.stringify(env),
    },
  });
  const stop = async () => {
    if (!exited(child)) {
      child.kill("SIGTERM");
      const deadline = Date.now() + 10_000;
      while (!exited(child) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      if (!exited(child)) child.kill("SIGKILL");
    }
    // The launcher stops the server before it exits; wait until the port is free for the next test.
    const deadline = Date.now() + 10_000;
    while ((await portInUse(PORTS.appVariant)) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };
  const variant: AppVariant = { url: URLS.appVariant, log: () => lastLines(APP_VARIANT_LOG), stop };

  const started = Date.now();
  for (;;) {
    if (exited(child)) {
      throw new Error(`The second app server exited before it was ready.\n${variant.log()}`);
    }
    try {
      const response = await fetch(`${URLS.appVariant}/api/aa/rpc`, { signal: AbortSignal.timeout(3_000) });
      if (response.ok && ((await response.json()) as { configured?: boolean }).configured === true) break;
    } catch {
      // not listening yet
    }
    if (Date.now() - started > 90_000) {
      await stop();
      throw new Error(`The second app server was not ready after 90 s.\n${variant.log()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  for (const route of WARM_UP_ROUTES) {
    try {
      await (await fetch(`${URLS.appVariant}${route}`, { signal: AbortSignal.timeout(120_000) })).arrayBuffer();
    } catch {
      // A route that fails here fails in the test too, with a better message.
    }
  }
  return variant;
}
