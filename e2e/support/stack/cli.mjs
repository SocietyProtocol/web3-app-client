#!/usr/bin/env node
// Command line for the hermetic stack.
//   node e2e/support/stack/cli.mjs up        start everything and stay in the foreground
//                                            (--exit-with-parent: stop when the starting process dies)
//   node e2e/support/stack/cli.mjs down      stop every running stack
//   node e2e/support/stack/cli.mjs status    print what is running
//   node e2e/support/stack/cli.mjs stamp     print the fingerprint of the app sources
//   node e2e/support/stack/cli.mjs baseline  record the subgraph baseline for the fork block
//
// With E2E_WORKERS=N, `up` starts N stacks, one per Playwright worker (see
// "Several workers" in e2e/README.md). This process supervises stack 0 and
// starts one more supervisor per further stack (`up --member`, with
// E2E_STACK_INDEX set). Stopping stack 0 stops them all. `down` and `status`
// look at every stack there can be, whatever E2E_WORKERS says now.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_STACKS, STACK_INDEX, stackCount, stackPorts, stackStateDir, stackUrls } from "./config.mjs";
import { pause, portInUse, tailFile } from "./processes.mjs";

const command = process.argv[2];
const CLI = fileURLToPath(import.meta.url);
/** A cold `next build` takes several minutes; a stack that only starts takes seconds. */
const MEMBER_START_TIMEOUT_MS = 5 * 60 * 1000;
const ALL_STACKS = Array.from({ length: MAX_STACKS }, (_, index) => index);

const stateFile = (index) => path.join(stackStateDir(index), "state.json");

async function health(index) {
  try {
    const response = await fetch(`${stackUrls(index).control}/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
}

/** The busy ports of the given stacks, as "port (name)", with the stack's number when it is not 0. */
async function busyPorts(indexes) {
  const checks = indexes.flatMap((index) =>
    Object.entries(stackPorts(index)).map(async ([name, port]) =>
      (await portInUse(port)) ? `${port} (${index === 0 ? name : `${name} of stack ${index}`})` : undefined,
    ),
  );
  return (await Promise.all(checks)).filter(Boolean);
}

/** The state a stack's supervisor recorded, or undefined when there is none (it stopped in order, or never ran). */
function recordedState(index) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(index), "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * SIGKILL to what a supervisor that was just killed, or just died, had
 * started: anvil, alto, the paymaster and `next start` do not watch their
 * parent, and a supervisor that is killed outright cannot stop them. Only
 * for a supervisor that was a child of this process a moment ago, so the
 * recorded pids are still its children's. Removes the state file.
 */
function killRecordedChildren(index) {
  const state = recordedState(index);
  if (!state) return;
  for (const pid of Object.values(state.pids ?? {})) {
    if (!Number.isInteger(pid) || pid <= 1) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
  fs.rmSync(stateFile(index), { force: true });
}

/**
 * Starts the supervisor of stack `index` and waits until that stack is
 * ready. It serves the build this process has just made sure of, and stops
 * by itself when this process goes away, however that happens.
 * `onLateExit(index)` is called if it exits after it was ready; an exit
 * before that makes this function throw.
 */
async function startMember(index, members, onLateExit) {
  const logDir = path.join(stackStateDir(index), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, "supervisor.log");
  const out = fs.openSync(logFile, "w");
  const child = spawn(process.execPath, [CLI, "up", "--member", "--exit-with-parent"], {
    stdio: ["ignore", out, out],
    env: { ...process.env, E2E_STACK_INDEX: String(index) },
  });
  fs.closeSync(out);
  members.push({ index, child });
  // Listen from the start: Node does not repeat an exit that has already
  // happened, and the stacks after this one take a while to start.
  let ready = false;
  child.once("exit", () => {
    if (ready) onLateExit(index);
  });

  const started = Date.now();
  for (;;) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Stack ${index} did not start.\n--- last lines of ${logFile}\n${tailFile(logFile, 30)}`);
    }
    if ((await health(index))?.ready) {
      ready = true;
      return;
    }
    if (Date.now() - started > MEMBER_START_TIMEOUT_MS) {
      throw new Error(`Stack ${index} was not ready in time.\n--- last lines of ${logFile}\n${tailFile(logFile, 30)}`);
    }
    await pause(150);
  }
}

const alive = ({ child }) => child.exitCode === null && child.signalCode === null;

/**
 * SIGTERM to every member supervisor (each stops its own stack), then wait
 * for them to exit. The grace is shorter than the one a test run gives
 * stack 0 (global-setup.ts), so that stack 0 is not killed while it waits
 * here.
 */
async function stopMembers(members, graceMs = 10_000) {
  for (const member of members) {
    if (alive(member)) member.child.kill("SIGTERM");
  }
  const deadline = Date.now() + graceMs;
  while (members.some(alive) && Date.now() < deadline) await pause(50);
  for (const member of members) {
    if (!alive(member)) continue;
    // A killed supervisor cannot stop what it started, and those processes
    // do not stop by themselves: kill them first, from its state file.
    killRecordedChildren(member.index);
    member.child.kill("SIGKILL");
  }
}

async function up() {
  const member = process.argv.includes("--member");
  const exitWithParent = process.argv.includes("--exit-with-parent");
  if (!member && STACK_INDEX !== 0) {
    throw new Error("E2E_STACK_INDEX is set by the launcher itself. Unset it and use E2E_WORKERS=<n> for several stacks.");
  }
  const count = member ? 1 : stackCount();
  const label = STACK_INDEX === 0 ? "[stack]" : `[stack ${STACK_INDEX}]`;

  if (count > 1) {
    // Every stack's ports, before anything is built or started: a busy port
    // of the last stack would otherwise only show after all the others are up.
    const busy = await busyPorts(Array.from({ length: count }, (_, index) => index));
    if (busy.length) {
      throw new Error(
        `Cannot start ${count} hermetic stacks: port ${busy.join(", ")} is already in use.\n` +
          "If an earlier stack is still running, stop it with `yarn test:e2e:stack:down`.\n" +
          "Otherwise find the owner with `lsof -nP -iTCP:<port> -sTCP:LISTEN` and stop it.",
      );
    }
  }

  const { startStack } = await import("./index.mjs");
  const stack = await startStack({
    log: (line) => console.log(`${label} ${line}`),
    exitWithParent,
    build: !member,
    stacks: count,
  });
  console.log(`${label} ready in ${Math.round(stack.state.timings.totalMs / 1000)}s: app ${stack.state.urls.app}`);

  if (count > 1) {
    const members = [];
    stack.onStop(() => stopMembers(members));
    stack.onExit(() => {
      for (const member of members) {
        if (alive(member)) member.child.kill("SIGTERM");
      }
    });
    // A member that dies once it is up takes the whole set down: a worker
    // without a stack would fail every test with a connection error. If it
    // was killed (out of memory, kill -9) it left its processes running and
    // its state file behind; if it stopped in order there is no state file.
    const onLateExit = (index) => {
      killRecordedChildren(index);
      stack.stopAndExit(`stack ${index} exited`, 1);
    };
    try {
      // One after another: each start reads the fork's state from the same
      // public RPC and warms an app server up.
      for (let index = 1; index < count; index += 1) {
        const started = Date.now();
        await startMember(index, members, onLateExit);
        console.log(`[stack] stack ${index} ready in ${Math.round((Date.now() - started) / 1000)}s: app ${stackUrls(index).app}`);
      }
    } catch (error) {
      await stack.stop();
      throw error;
    }
    console.log(`[stack] ${count} stacks are up`);
  }
  console.log(`${label} READY`);
}

async function down() {
  // A stack that is still starting answers too (ready: false).
  const running = await Promise.all(ALL_STACKS.map((index) => health(index)));
  const touched = new Set([0]);
  /** Stacks whose supervisor did not answer, whose leftovers were signalled from their state file. */
  const leftovers = new Set();
  // Stack 0 first: it stops the stacks it started. The others are asked as
  // well, for the case that stack 0 is gone and they have not noticed yet.
  for (const index of ALL_STACKS) {
    if (running[index]) {
      touched.add(index);
      await fetch(`${stackUrls(index).control}/stop`, { method: "POST" }).catch(() => undefined);
    } else if (fs.existsSync(stateFile(index))) {
      // The supervisor does not answer but left a state file. If one of the
      // stack's ports is still busy, stop it and what it started. If none
      // is, the file is left over from a stack that is long gone (a killed
      // supervisor, a reboot) and its pids may be someone else's by now:
      // signal nothing.
      if ((await busyPorts([index])).length) {
        touched.add(index);
        leftovers.add(index);
        const state = recordedState(index) ?? {};
        for (const pid of [state.supervisorPid, ...Object.values(state.pids ?? {})]) {
          if (!Number.isInteger(pid) || pid <= 1) continue;
          try {
            process.kill(pid, "SIGTERM");
          } catch {
            // already gone
          }
        }
      }
      fs.rmSync(stateFile(index), { force: true });
    }
  }
  // Only the ports of stacks that were there: a port of a stack that never
  // ran may belong to something else.
  const indexes = [...touched];
  const deadline = Date.now() + 30_000;
  let busy = await busyPorts(indexes);
  while (busy.length && Date.now() < deadline) {
    await pause(200);
    busy = await busyPorts(indexes);
  }
  if (busy.length) {
    console.error(`[stack] still listening: ${busy.join(", ")}. Find the owner with lsof -nP -iTCP:<port> -sTCP:LISTEN`);
    process.exit(1);
  }
  const stopped = running.filter(Boolean).length + leftovers.size;
  console.log(stopped > 1 ? `[stack] stopped ${stopped} stacks` : stopped ? "[stack] stopped" : "[stack] nothing was running");
}

async function status() {
  const all = await Promise.all(ALL_STACKS.map((index) => health(index)));
  const running = all.filter(Boolean);
  const first = all[0];
  if (!running.length) {
    const busy = await busyPorts([0]);
    console.log(busy.length ? `[stack] not running, but these ports are busy: ${busy.join(", ")}` : "[stack] not running");
    process.exit(1);
  }
  // One stack, the usual case: its state, as before. Several: all of them.
  if (running.length === 1 && first && (first.stacks ?? 1) === 1) console.log(JSON.stringify(first, null, 2));
  else console.log(JSON.stringify({ stacks: running }, null, 2));

  // Ready means: stack 0 and every stack it is responsible for.
  const expected = first ? (first.stacks ?? 1) : 0;
  const ready = !!first && ALL_STACKS.slice(0, expected).every((index) => all[index]?.ready);
  if (!first) console.log("[stack] stack 0 is not running, but other stacks are: run `yarn test:e2e:stack:down`");
  else if (!ready) console.log(`[stack] not all of the ${expected} stacks are ready`);
  process.exit(ready ? 0 : 1);
}

switch (command) {
  case "up":
    await up().catch((error) => {
      console.error(`[stack] ${error.message}`);
      process.exit(1);
    });
    break;
  case "down":
    await down();
    break;
  case "status":
    await status();
    break;
  case "stamp": {
    const { buildStamp } = await import("./app.mjs");
    console.log(buildStamp());
    break;
  }
  case "baseline": {
    const { recordBaseline } = await import("../backends/record-baseline.mjs");
    await recordBaseline();
    break;
  }
  default:
    console.error("usage: cli.mjs up | down | status | stamp | baseline");
    process.exit(2);
}
