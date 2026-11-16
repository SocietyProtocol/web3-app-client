// Starts and stops the whole hermetic stack:
//   anvil -> alto -> mock paymaster -> fake subgraph + fake S3 -> the app.
import fs from "node:fs";
import http from "node:http";
import { startChainStack } from "../chain/aa-stack.mjs";
import { startBackends } from "../backends/server.mjs";
import { ensureBuild, startApp } from "./app.mjs";
import {
  FORK_BLOCK,
  FORK_RPC_URL,
  HOST,
  LOG_DIR,
  PORTS,
  STACK_INDEX,
  STATE_DIR,
  STATE_FILE,
  URLS,
} from "./config.mjs";
import { ProcessGroup, assertPortsFree } from "./processes.mjs";

function forkHost() {
  try {
    return new URL(FORK_RPC_URL).host; // never the path or query: they may hold a key
  } catch {
    return "(invalid URL)";
  }
}

/**
 * Starts everything and returns { state, stop, onStop }. `log` receives
 * progress lines. The process becomes the stack's supervisor: it stops
 * everything it started on SIGTERM / SIGINT / SIGHUP, on POST /stop, when
 * starting fails and, with `exitWithParent`, when the process that spawned
 * it goes away.
 *
 * `build: false` is for a stack that serves a build another stack has just
 * made sure of. `stacks` is how many stacks the supervisor is responsible
 * for in all (itself and the ones it starts afterwards); it is only
 * reported. `onStop(fn)` adds something to stop together with this stack, and
 * `onExit(fn)` something to do, synchronously, when the process exits.
 */
export async function startStack({ log = () => {}, exitWithParent = false, build = true, stacks = 1 } = {}) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  await assertPortsFree(PORTS);

  const group = new ProcessGroup();
  let backends;
  let control;
  let stopping;
  let buildChild;
  const stopHooks = [];
  const exitHooks = [];

  const state = {
    ready: false,
    stackIndex: STACK_INDEX,
    stacks,
    startedAt: new Date().toISOString(),
    supervisorPid: process.pid,
    pids: {},
    urls: URLS,
    forkBlock: FORK_BLOCK,
    forkHost: forkHost(),
    buildStamp: undefined,
    timings: {},
    logDir: LOG_DIR,
  };
  const writeState = () => {
    state.pids = group.pids();
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  };

  function stop() {
    stopping ??= (async () => {
      buildChild?.kill("SIGTERM");
      // Together with what was started after this stack (the other stacks
      // of a set): none of them needs this stack's processes, and a slow one
      // must not use up the time this supervisor is given to stop.
      await Promise.all([
        ...stopHooks.map((hook) => Promise.resolve().then(hook).catch(() => undefined)),
        group.stop(),
      ]);
      await backends?.stop();
      await new Promise((resolve) => {
        if (!control) return resolve();
        control.closeAllConnections?.();
        control.close(() => resolve());
      });
      fs.rmSync(STATE_FILE, { force: true });
    })();
    return stopping;
  }
  const stopAndExit = (reason, code = 0) => {
    if (stopping) return;
    log(`${reason}: stopping`);
    stop().then(
      () => process.exit(code),
      () => process.exit(1),
    );
  };

  process.once("exit", () => {
    buildChild?.kill("SIGKILL");
    for (const hook of exitHooks) {
      try {
        hook();
      } catch {
        // nothing left to do about it
      }
    }
    group.killNow();
  });
  for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
    process.on(signal, () => stopAndExit(signal));
  }
  if (exitWithParent) {
    // Started by a test run: if that process dies without stopping us (a
    // kill -9, a crash), the parent pid changes. Do not outlive it.
    const parent = process.ppid;
    setInterval(() => {
      if (process.ppid !== parent) stopAndExit("the process that started the stack is gone");
    }, 1_000).unref();
  }

  try {
    // The supervisor's own endpoint comes first, so that a stack that is
    // still starting can be found and stopped too.
    control = http.createServer((request, response) => {
      const send = (status, body) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      };
      if (request.url === "/health") return send(200, state);
      if (request.url === "/stop" && request.method === "POST") {
        send(200, { stopping: true });
        setImmediate(() => stopAndExit("stop requested"));
        return;
      }
      send(404, { error: "Not found" });
    });
    await new Promise((resolve, reject) => {
      control.once("error", reject);
      control.listen(PORTS.control, HOST, resolve);
    });
    writeState();

    const started = Date.now();
    log(build ? `building the app if its sources changed (logs: ${LOG_DIR})` : `logs: ${LOG_DIR}`);
    const built = await ensureBuild({ onChild: (child) => (buildChild = child), build });
    buildChild = undefined;
    state.buildStamp = built.stamp;
    state.timings.buildMs = built.ms;
    log(built.built ? `app built in ${Math.round(built.ms / 1000)}s` : "app build is up to date");

    log(`starting anvil (fork of Sepolia at block ${FORK_BLOCK} via ${forkHost()}), alto and the paymaster`);
    const chain = await startChainStack(group);
    Object.assign(state.timings, chain.timings);
    writeState();

    backends = await startBackends();
    log(`fake subgraph and S3 are up (baseline: ${JSON.stringify(backends.counts)})`);

    const app = await startApp(group);
    state.timings.appMs = app.ms;
    state.timings.appWarmUpMs = app.warmUpMs;
    state.timings.totalMs = Date.now() - started;
    state.ready = true;
    writeState();
    return {
      state,
      stop,
      onStop: (hook) => stopHooks.push(hook),
      onExit: (hook) => exitHooks.push(hook),
      stopAndExit,
    };
  } catch (error) {
    if (!stopping) await stop();
    throw error;
  }
}
