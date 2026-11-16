// Local chain and account-abstraction stack for the hermetic layer:
//   anvil (fork of Sepolia, chain id 11155111)  <-  alto (bundler)  <-  mock paymaster
// Each is its own OS process on a fixed local port. alto is GPL-3.0-or-later:
// it is only spawned here, never imported (see e2e/README.md).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { bytesToHex } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import {
  AA_STACK_DIR,
  CHAIN_ID,
  CONTRACTS,
  FORK_BLOCK,
  FORK_RPC_URL,
  HOST,
  KEY_INDEX,
  PORTS,
  TEST_MNEMONIC,
  URLS,
  baseEnv,
} from "../stack/config.mjs";
import { jsonRpc, waitFor } from "../stack/processes.mjs";

/** What alto 0.0.21 is told about the chain's block time (its default is 1000). */
const ALTO_BLOCK_TIME_MS = 100;

const aaRequire = createRequire(path.join(AA_STACK_DIR, "package.json"));

function testPrivateKey(index) {
  return bytesToHex(mnemonicToAccount(TEST_MNEMONIC, { addressIndex: index }).getHdKey().privateKey);
}

function missingStack(detail) {
  return new Error(
    `${detail}\nInstall the local chain stack first: npm ci --prefix e2e/aa-stack --ignore-scripts`,
  );
}

/** The anvil binary shipped by the @foundry-rs/anvil npm package for this platform. */
export function anvilBinary() {
  if (process.env.E2E_ANVIL_BIN) return process.env.E2E_ANVIL_BIN;
  const arch = { arm64: "arm64", x64: "amd64" }[process.arch];
  const platformName = { darwin: "darwin", linux: "linux", win32: "win32" }[process.platform];
  try {
    const packageJson = aaRequire.resolve(`@foundry-rs/anvil-${platformName}-${arch}/package.json`);
    return path.join(path.dirname(packageJson), "bin", process.platform === "win32" ? "anvil.exe" : "anvil");
  } catch {
    throw missingStack(`No anvil binary for ${process.platform}/${process.arch} in e2e/aa-stack/node_modules.`);
  }
}

/** alto's CLI entry. Its package.json has an exports map, so look on disk. */
function altoCli() {
  const candidate = path.join(AA_STACK_DIR, "node_modules", "@pimlico", "alto", "esm", "cli", "alto.js");
  if (!fs.existsSync(candidate)) throw missingStack("@pimlico/alto is not installed in e2e/aa-stack.");
  return candidate;
}

/**
 * Starts anvil, then alto, then the mock paymaster, in `group`.
 * Returns the timings and the fork that anvil serves.
 */
export async function startChainStack(group) {
  const timings = {};

  const anvil = group.launch(
    "anvil",
    anvilBinary(),
    [
      "--fork-url", FORK_RPC_URL,
      "--fork-block-number", String(FORK_BLOCK),
      "--retries", "8",
      "--timeout", "30000",
      "--chain-id", String(CHAIN_ID),
      "--host", HOST,
      "--port", String(PORTS.anvil),
      "--mnemonic", TEST_MNEMONIC,
      "--accounts", "4",
      "--balance", "10000",
    ],
    { env: baseEnv() },
  );
  timings.anvilMs = (
    await waitFor("anvil", async () => Number(await jsonRpc(URLS.anvil, "eth_chainId", [], 2_000)) === CHAIN_ID, {
      timeoutMs: 90_000,
      entry: anvil,
    })
  ).ms;

  // A fork starts at the fork block's timestamp. Move the chain clock to now,
  // so that signatures with a wall-clock deadline and on-screen times behave
  // as they do on a live chain.
  await jsonRpc(URLS.anvil, "evm_setTime", [Math.floor(Date.now() / 1000)]);
  await jsonRpc(URLS.anvil, "evm_mine", []);

  for (const [name, address] of [["EntryPoint 0.7", CONTRACTS.entryPointV07], ["badges", CONTRACTS.badges]]) {
    const code = await jsonRpc(URLS.anvil, "eth_getCode", [address, "latest"], 60_000);
    if (!code || code === "0x") {
      throw new Error(`The fork has no code for the ${name} contract at ${address}. Check the fork RPC and block.`);
    }
  }

  const alto = group.launch(
    "alto",
    process.execPath,
    [
      altoCli(),
      "--entrypoints", CONTRACTS.entryPointV07,
      "--rpc-url", URLS.anvil,
      // Two executors. alto frees an executor once it has seen its bundle in
      // a block, and it skips a block event that comes while it is still
      // handling the previous one. Anvil mines only when something is sent,
      // so a skipped block may never be followed by another: with a single
      // executor the next user operation then waits for it forever (seen on
      // a busy machine with four stacks). The second executor sends that
      // operation, its block lets alto catch up with the first.
      "--executor-private-keys",
      [KEY_INDEX.altoExecutor, KEY_INDEX.altoSecondExecutor].map(testPrivateKey).join(","),
      "--utility-private-key", testPrivateKey(KEY_INDEX.altoUtility),
      "--port", String(PORTS.alto),
      // ERC-7562 validation does not work on this stack; it is covered by the live layer.
      "--safe-mode", "false",
      "--log-level", "info",
      // Anvil mines a block per transaction, at once. alto assumes a block
      // every second by default and looks for new ones every half of that;
      // its waits for a bundle to be mined are fractions of the same value.
      "--block-time", String(ALTO_BLOCK_TIME_MS),
      "--block-polling-interval", String(ALTO_BLOCK_TIME_MS / 2),
    ],
    { cwd: AA_STACK_DIR, env: baseEnv() },
  );
  timings.altoMs = (
    await waitFor(
      "alto",
      async () => {
        const supported = await jsonRpc(URLS.alto, "eth_supportedEntryPoints", [], 2_000);
        return Array.isArray(supported) && supported.length > 0;
      },
      { timeoutMs: 120_000, entry: alto },
    )
  ).ms;

  const paymaster = group.launch(
    "paymaster",
    process.execPath,
    [path.join(AA_STACK_DIR, "paymaster-server.mjs"), URLS.anvil, URLS.alto, String(PORTS.paymaster)],
    { cwd: AA_STACK_DIR, env: baseEnv() },
  );
  timings.paymasterMs = (
    await waitFor(
      "mock paymaster",
      async () => (await fetch(`${URLS.paymaster}/ping`, { signal: AbortSignal.timeout(2_000) })).ok,
      { timeoutMs: 120_000, entry: paymaster },
    )
  ).ms;

  return { timings, forkBlock: FORK_BLOCK, forkRpcUrl: FORK_RPC_URL };
}
