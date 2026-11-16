import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { MAX_STACKS, stackUrls } from "./env/hermetic";

/**
 * Starts the hermetic stack for the projects that need it (api, hermetic,
 * hermetic-serial) and stops it when the run ends.
 *
 * The stack is a separate supervisor process (support/stack/cli.mjs up).
 * If one is already running (`yarn test:e2e:stack`), the run uses it and
 * leaves it running, which saves the start-up time while writing tests.
 *
 * A run with several workers needs one stack per worker (see "Several
 * workers" in e2e/README.md): stack 0's supervisor starts the others, and
 * the run waits until every one of them is ready.
 */
const CLI = path.join(__dirname, "support", "stack", "cli.mjs");
const LOG_FILE = path.join(__dirname, ".stack", "logs", "supervisor.log");
const STACK_PROJECTS = new Set(["api", "hermetic", "hermetic-serial", "hermetic-timetravel"]);
const STATE_FILE = path.join(__dirname, ".stack", "state.json");
const START_TIMEOUT_MS = 20 * 60 * 1000; // a cold `next build` takes several minutes
/**
 * What stack 0's supervisor gets to stop everything. It gives its own
 * processes 5 s and the other stacks' supervisors 10 s (cli.mjs), at the
 * same time; this is longer than both.
 */
const STOP_GRACE_MS = 30_000;

/**
 * SIGKILL to what stack 0's supervisor started, from its state file: anvil,
 * alto, the paymaster and `next start` do not watch their parent, and a
 * supervisor that is killed outright cannot stop them. The supervisors of
 * the other stacks notice that it is gone and stop in order.
 */
function killRecordedChildren() {
  let pids: unknown[] = [];
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as { pids?: Record<string, unknown> };
    pids = Object.values(state.pids ?? {});
  } catch {
    return; // no state file: it stopped in order, or had started nothing yet
  }
  for (const pid of pids) {
    if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 1) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
  fs.rmSync(STATE_FILE, { force: true });
}

type StackState = {
  ready: boolean;
  startedAt: string;
  buildStamp: string;
  /** How many stacks stack 0's supervisor is responsible for. Absent in a state written by an older launcher. */
  stacks?: number;
  timings: { totalMs: number };
};

/** Projects named with --project on the command line; empty means all. */
function selectedProjects(): string[] {
  const names: string[] = [];
  const argv = process.argv;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--project" || argv[index] === "-p") {
      for (let next = index + 1; next < argv.length && !argv[next].startsWith("-"); next += 1) names.push(argv[next]);
    } else if (argv[index].startsWith("--project=")) {
      names.push(argv[index].slice("--project=".length));
    }
  }
  return names;
}

async function health(index = 0): Promise<StackState | undefined> {
  try {
    const response = await fetch(`${stackUrls(index).control}/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok ? ((await response.json()) as StackState) : undefined;
  } catch {
    return undefined;
  }
}

function tail(file: string, lines = 30) {
  try {
    return fs.readFileSync(file, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

/** The state of every one of the first `count` stacks, or undefined as soon as one is not ready. */
async function allReady(count: number): Promise<StackState[] | undefined> {
  const states = await Promise.all(Array.from({ length: count }, (_, index) => health(index)));
  return states.every((state) => state?.ready) ? (states as StackState[]) : undefined;
}

export default async function globalSetup(config: FullConfig) {
  // One stack per worker. `config.workers` is the resolved number: E2E_WORKERS
  // through the config, or --workers on the command line.
  const stacks = config.workers;
  if (stacks > MAX_STACKS) {
    throw new Error(`This run has ${stacks} workers, but there are at most ${MAX_STACKS} stacks. Use ${MAX_STACKS} workers or fewer.`);
  }
  const selected = selectedProjects();
  const needsStack = selected.length === 0 || selected.some((name) => STACK_PROJECTS.has(name));
  if (!needsStack) return;

  // One salt per run: test keys must differ from every earlier run on the same chain.
  process.env.E2E_RUN_SALT ||= randomBytes(6).toString("hex");

  let running = await health();
  // A stack that is still starting (someone just ran `yarn test:e2e:stack`): wait for it.
  for (const started = Date.now(); running && !running.ready && Date.now() - started < START_TIMEOUT_MS; ) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    running = await health();
  }
  if (running && !running.ready) throw new Error("The hermetic stack that is starting did not become ready in time.");
  if (running) {
    const has = running.stacks ?? 1;
    if (has < stacks) {
      throw new Error(
        `The hermetic stack that is already running has ${has} stack(s), and this run has ${stacks} workers.\n` +
          `Stop it (\`yarn test:e2e:stack:down\`) and start it with E2E_WORKERS=${stacks}, or run with ${has} worker(s).`,
      );
    }
    // Stack 0 is ready before the stacks it starts after itself.
    let states = await allReady(stacks);
    for (const started = Date.now(); !states && Date.now() - started < START_TIMEOUT_MS; ) {
      if (!(await health())) throw new Error("The hermetic stack stopped while its other stacks were starting.");
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      states = await allReady(stacks);
    }
    if (!states) throw new Error(`Not all of the ${stacks} hermetic stacks became ready in time.`);
    const stamp = execFileSync(process.execPath, [CLI, "stamp"], { encoding: "utf8" }).trim();
    if (states.some((state) => state.buildStamp !== stamp)) {
      const message =
        "A hermetic stack is already running, but it serves a build of older app sources.\n" +
        "Stop it with `yarn test:e2e:stack:down` and run again.";
      // For someone who knows the difference does not matter to what they are testing.
      if (process.env.E2E_ALLOW_STALE_STACK !== "1") throw new Error(message);
      console.warn(`[e2e] WARNING: ${message}\n[e2e] continuing because E2E_ALLOW_STALE_STACK=1`);
    }
    console.log(`[e2e] using the stack that is already running (started ${running.startedAt})`);
    return;
  }

  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const out = fs.openSync(LOG_FILE, "w");
  const supervisor = spawn(process.execPath, [CLI, "up", "--exit-with-parent"], {
    stdio: ["ignore", out, out],
    // The launcher reads the number of stacks from E2E_WORKERS; a member's index is its own business.
    env: { ...process.env, E2E_WORKERS: String(stacks), E2E_STACK_INDEX: "" },
  });
  fs.closeSync(out);
  console.log(
    `[e2e] starting ${stacks === 1 ? "the hermetic stack" : `${stacks} hermetic stacks, one per worker`} ` +
      `(log: ${path.relative(process.cwd(), LOG_FILE)})`,
  );

  const stop = async () => {
    if (supervisor.exitCode !== null || supervisor.signalCode !== null) return;
    supervisor.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        killRecordedChildren();
        supervisor.kill("SIGKILL");
        resolve();
      }, STOP_GRACE_MS);
      supervisor.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  };

  const started = Date.now();
  for (;;) {
    if (supervisor.exitCode !== null || supervisor.signalCode !== null) {
      throw new Error(`The hermetic stack did not start.\n--- last lines of ${LOG_FILE}\n${tail(LOG_FILE)}`);
    }
    if (await allReady(stacks)) {
      console.log(`[e2e] ${stacks === 1 ? "stack" : `${stacks} stacks`} ready in ${Math.round((Date.now() - started) / 1000)}s`);
      break;
    }
    if (Date.now() - started > START_TIMEOUT_MS) {
      await stop();
      throw new Error(`The hermetic stack was not ready in time.\n--- last lines of ${LOG_FILE}\n${tail(LOG_FILE)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return stop;
}
