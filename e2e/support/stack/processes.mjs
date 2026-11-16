// Small process helpers for the stack launcher: free-port checks, child
// processes with a log file each, readiness polling and ordered shutdown.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { HOST, LOG_DIR } from "./config.mjs";

export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves true when something already listens on the port. */
export function portInUse(port, host = HOST) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1_000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** Throws one error naming every busy port, so the fix is obvious. */
export async function assertPortsFree(ports) {
  const busy = [];
  for (const [name, port] of Object.entries(ports)) {
    if (await portInUse(port)) busy.push(`${port} (${name})`);
  }
  if (busy.length) {
    throw new Error(
      `Cannot start the hermetic stack: port ${busy.join(", ")} is already in use.\n` +
        "If an earlier stack is still running, stop it with `yarn test:e2e:stack:down`.\n" +
        "Otherwise find the owner with `lsof -nP -iTCP:<port> -sTCP:LISTEN` and stop it.",
    );
  }
}

export function tailFile(file, lines = 25) {
  try {
    return fs.readFileSync(file, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

export class ProcessGroup {
  constructor() {
    this.children = [];
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  /** Starts a child whose stdout and stderr go to <LOG_DIR>/<name>.log. */
  launch(name, command, args, options = {}) {
    const logFile = path.join(LOG_DIR, `${name}.log`);
    const out = fs.openSync(logFile, "w");
    const child = spawn(command, args, {
      stdio: ["ignore", out, out],
      cwd: options.cwd,
      env: options.env,
    });
    fs.closeSync(out);
    const entry = { name, child, logFile, spawnError: undefined };
    child.once("error", (error) => {
      entry.spawnError = error;
    });
    this.children.push(entry);
    return entry;
  }

  pids() {
    return Object.fromEntries(this.children.map(({ name, child }) => [name, child.pid]));
  }

  /** SIGTERM in reverse start order, then SIGKILL for whatever is left. */
  async stop(graceMs = 5_000) {
    const alive = ({ child }) => child.exitCode === null && child.signalCode === null;
    for (const entry of [...this.children].reverse()) {
      if (alive(entry)) entry.child.kill("SIGTERM");
    }
    const deadline = Date.now() + graceMs;
    while (Date.now() < deadline && this.children.some(alive)) await pause(50);
    for (const entry of this.children) {
      if (alive(entry)) entry.child.kill("SIGKILL");
    }
  }

  killNow() {
    for (const { child } of this.children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  }
}

/** Polls check() until it returns a truthy value; fails fast if the child died. */
export async function waitFor(label, check, { timeoutMs, entry, intervalMs = 150 }) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    if (entry?.spawnError) {
      throw new Error(`${label} could not be started: ${entry.spawnError.message}`);
    }
    if (entry && (entry.child.exitCode !== null || entry.child.signalCode !== null)) {
      throw new Error(
        `${label} exited (code ${entry.child.exitCode}, signal ${entry.child.signalCode}) before it was ready.\n` +
          `--- last lines of ${entry.logFile}\n${tailFile(entry.logFile)}`,
      );
    }
    try {
      const value = await check();
      if (value !== undefined && value !== false && value !== null) {
        return { value, ms: Date.now() - started };
      }
    } catch (error) {
      lastError = error;
    }
    await pause(intervalMs);
  }
  throw new Error(
    `${label} was not ready after ${Math.round(timeoutMs / 1000)}s (${lastError?.message ?? "no answer"}).` +
      (entry ? `\n--- last lines of ${entry.logFile}\n${tailFile(entry.logFile)}` : ""),
  );
}

/** Runs a command to completion with its output in a log file. */
export function run(name, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, `${name}.log`);
    const out = fs.openSync(logFile, "w");
    const child = spawn(command, args, {
      stdio: ["ignore", out, out],
      cwd: options.cwd,
      env: options.env,
    });
    fs.closeSync(out);
    options.onChild?.(child);
    child.once("error", (error) => reject(new Error(`${name} could not be started: ${error.message}`)));
    child.once("exit", (code, signal) => {
      if (code === 0) resolve({ logFile });
      else {
        reject(
          new Error(
            `${name} failed (code ${code}, signal ${signal}).\n--- last lines of ${logFile}\n${tailFile(logFile, 40)}`,
          ),
        );
      }
    });
  });
}

export async function jsonRpc(url, method, params = [], timeoutMs = 20_000) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json();
  if (body.error) {
    throw Object.assign(new Error(`${method}: ${JSON.stringify(body.error)}`), { rpcError: body.error });
  }
  return body.result;
}
