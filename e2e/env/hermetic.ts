import { getAddress, isAddressEqual, type Address } from "viem";
import { contracts } from "../../src/consts/contracts";
import { GOVERNOR_BADGE_ID } from "../../src/consts/badges";
import { ENTRY_POINT_V07 } from "../../src/lib/smart-account";
import path from "node:path";
import settings from "./hermetic.json";

/**
 * Public settings of the hermetic layer (local chain, bundler, fakes and the
 * app, all on fixed local ports). The values live in hermetic.json so that
 * the stack launcher, which is plain Node, reads the same file.
 *
 * A run with several workers (E2E_WORKERS) has one whole stack per worker.
 * PORTS and URLS are those of the stack of the process that imports this
 * file: in a Playwright worker the stack with the worker's parallel index,
 * in the main process (config, global setup) stack 0. The same rules are in
 * support/stack/config.mjs for the launcher.
 */
const HOST = "127.0.0.1";

export const CHAIN_ID = settings.chainId;
export const FORK_BLOCK = Number(process.env.E2E_FORK_BLOCK || settings.fork.block);

/** The highest number of stacks, and so of workers. */
export const MAX_STACKS = settings.stacks.max;

/** A whole number from 1 to MAX_STACKS out of E2E_WORKERS, or 1. */
export function workersFromEnv(): number {
  const raw = process.env.E2E_WORKERS;
  if (!raw) return 1;
  if (!/^[1-9][0-9]*$/.test(raw) || Number(raw) > MAX_STACKS) {
    throw new Error(`E2E_WORKERS must be a whole number from 1 to ${MAX_STACKS}, got "${raw}"`);
  }
  return Number(raw);
}

export function stackPorts(index: number) {
  const offset = index * settings.stacks.portStep;
  const { app, anvil, alto, paymaster, subgraph, s3, control } = settings.ports;
  return {
    app: app + offset,
    anvil: anvil + offset,
    alto: alto + offset,
    paymaster: paymaster + offset,
    subgraph: subgraph + offset,
    s3: s3 + offset,
    control: control + offset,
  };
}

export function stackUrls(index: number) {
  const ports = stackPorts(index);
  const url = (port: number) => `http://${HOST}:${port}`;
  return {
    app: url(ports.app),
    anvil: url(ports.anvil),
    alto: url(ports.alto),
    paymaster: url(ports.paymaster),
    subgraph: url(ports.subgraph),
    s3: url(ports.s3),
    control: url(ports.control),
  };
}

/** Where the launcher keeps the logs of one stack (support/stack/config.mjs). */
export function stackLogDir(index: number) {
  const root = path.join(__dirname, "..", ".stack");
  return path.join(index === 0 ? root : path.join(root, `stack-${index}`), "logs");
}

/**
 * Playwright numbers its workers 0 to workers - 1 (the parallel index; a
 * worker that replaces a failed one takes over its number) and sets this
 * before a worker loads any file. It is unset in the main process.
 */
function ownStackIndex(): number {
  const raw = process.env.TEST_PARALLEL_INDEX;
  if (!raw) return 0;
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_STACKS) {
    throw new Error(
      `This worker has parallel index ${raw}, but there are at most ${MAX_STACKS} stacks. Run with ${MAX_STACKS} workers or fewer.`,
    );
  }
  return index;
}

/** The stack this process talks to. */
export const STACK_INDEX = ownStackIndex();
export const PORTS = stackPorts(STACK_INDEX);
export const URLS = stackUrls(STACK_INDEX);
export const STACK_LOG_DIR = stackLogDir(STACK_INDEX);

/** TEST-ONLY mnemonic, public on purpose. Only ever used on the local fork. */
export const TEST_ONLY_MNEMONIC = settings.TEST_ONLY_MNEMONIC.phrase;
export const KEY_INDEX = settings.TEST_ONLY_MNEMONIC.indexes;

/**
 * The test wallets the tested build treats as members from before smart
 * accounts: compiled into its legacy account map (NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS,
 * see support/stack/config.mjs). `index` is the wallet's key index; both
 * addresses are lowercase. The `legacy` persona takes its wallets from here.
 */
export const LEGACY_POOL: { index: number; wallet: Address; society: Address }[] = Object.entries(
  settings.legacyAccounts.pairs,
).map(([wallet, society], position) => ({
  index: KEY_INDEX.legacyStart + position,
  wallet: wallet.toLowerCase() as Address,
  society: society.toLowerCase() as Address,
}));

export const BADGES_ADDRESS: Address = getAddress(settings.contracts.badges);
/** The block the badges contract was deployed in. */
export const BADGES_START_BLOCK = settings.contracts.badgesStartBlock;
export const ENTRY_POINT_ADDRESS: Address = getAddress(settings.contracts.entryPointV07);
export const COMMUNITY_REGISTRY_ADDRESS: Address = contracts.communityRegistry.sepolia;
export const GOVERNOR_BADGE = GOVERNOR_BADGE_ID.sepolia;

/**
 * The auction id the tested build was compiled with (NEXT_PUBLIC_AUCTION_ID),
 * or undefined when it has none. The launcher reads the same value
 * (support/stack/config.mjs).
 */
export const AUCTION_ID: number | undefined = (settings.auction as { id: number | null }).id ?? undefined;

/** Where the app's metadata URIs point; the tests serve it from the S3 fake. */
export const IPFS_GATEWAY = settings.ipfsGateway;
/** Host of the RPC URL compiled into the client bundle; routed to anvil. */
export const BROWSER_RPC_HOST = settings.browserRpcHost;

// The launcher cannot import the app's TypeScript, so the addresses are
// repeated in hermetic.json. Fail loudly if they drift apart.
if (!isAddressEqual(BADGES_ADDRESS, contracts.badges.sepolia)) {
  throw new Error("e2e/env/hermetic.json: contracts.badges differs from src/consts/contracts.ts");
}
if (!isAddressEqual(ENTRY_POINT_ADDRESS, ENTRY_POINT_V07)) {
  throw new Error("e2e/env/hermetic.json: contracts.entryPointV07 differs from src/lib/smart-account.ts");
}
