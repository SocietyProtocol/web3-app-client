/**
 * Shared pieces of the smart account migration scripts: chain config,
 * Light Account addresses, RPC rotation, the chunked log scan, badge
 * discovery and the Safe batch format. Pure where possible so the
 * tests can cover it without a network.
 */
import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  http,
  keccak256,
  pad,
  toBytes,
  toHex,
} from "viem";
import { mainnet, sepolia } from "viem/chains";

export const FACTORY = getAddress("0x0000000000400CdFef5E2714E63d8040b700BC24");
export const IMPLEMENTATION = getAddress(
  "0x8E8e658E22B12ada97B402fF0b044D6A325013C7",
);
export const ENTRY_POINT = getAddress("0x0000000071727De22E5E9d8BAf0edAc6f37da032");

/** Badges moved on mainnet when the migration was planned. */
export const EXPECTED_MAINNET_MIGRATABLE = [13n, 24n, 25n, 26n, 27n, 28n, 50n];

/**
 * Per chain: badges proxy, its deploy block (subgraph startBlock), and
 * the public read-only RPCs to rotate across. Some of these cannot serve
 * old logs (publicnode prunes, 1rpc caps at 50 blocks); the scan learns
 * that and moves on.
 */
export const CHAINS = {
  mainnet: {
    chain: mainnet,
    badges: getAddress("0x2313C0cDdc233c92d16c2cfE17DF5fDCcE556763"),
    deployBlock: 25099621n,
    defaultSafeEns: "societyprotocol.eth",
    rpcs: [
      "https://ethereum-rpc.publicnode.com",
      "https://eth.llamarpc.com",
      "https://1rpc.io/eth",
      "https://eth.drpc.org",
      "https://rpc.mevblocker.io",
      "https://mainnet.gateway.tenderly.co",
      "https://rpc.flashbots.net",
    ],
  },
  sepolia: {
    chain: sepolia,
    badges: getAddress("0x12406bB6d11Cb641e100F1d8595c0C5e63F0bD47"),
    deployBlock: 10845618n,
    defaultSafeEns: undefined,
    rpcs: [
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://sepolia.drpc.org",
      "https://sepolia.gateway.tenderly.co",
      "https://1rpc.io/sepolia",
    ],
  },
};

export const badgesAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "id", type: "uint256" },
      { name: "value", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "isProfileBadge",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "badges",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "hook", type: "address" },
      { name: "isOfficial", type: "bool" },
      { name: "isCommunityBadge", type: "bool" },
      { name: "metadataURI", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getBadgeMinters",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getBadgeBurners",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "uint256[]" }],
  },
];

export const factoryAbi = [
  {
    type: "function",
    name: "getAddress",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ type: "address" }],
  },
];

export const profileCreatedEvent = {
  type: "event",
  name: "ProfileCreated",
  inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "id", type: "uint256", indexed: true },
  ],
};

/** Parses `--flag value` and `--flag=value`. Bare flags become true. */
export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument ${token}`);
    const [key, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) {
      args[key] = inline;
    } else if (argv[index + 1] !== undefined && !argv[index + 1].startsWith("--")) {
      args[key] = argv[++index];
    } else {
      args[key] = true;
    }
  }
  return args;
}

export function chainConfig(name = "mainnet") {
  const config = CHAINS[name];
  if (!config) {
    throw new Error(`--chain must be one of ${Object.keys(CHAINS).join(", ")}, got ${name}`);
  }
  return { name, ...config };
}

/** RPC_URL first when set, then the chain's public endpoints. */
export function rpcList(config, rpcUrl = process.env.RPC_URL) {
  const list = rpcUrl ? [rpcUrl, ...config.rpcs] : [...config.rpcs];
  return [...new Set(list)];
}

/** Public endpoints print as-is; anything else prints as its host only, so a keyed RPC_URL never leaks. */
export function rpcLabel(url) {
  const known = Object.values(CHAINS).some((config) => config.rpcs.includes(url));
  if (known) return url.replace(/^https?:\/\//, "");
  try {
    return `${new URL(url).host} (RPC_URL)`;
  } catch {
    return "RPC_URL";
  }
}

export function makeClients(config, urls) {
  return urls.map((url) => ({
    url,
    label: rpcLabel(url),
    client: createPublicClient({
      chain: config.chain,
      transport: http(url, { retryCount: 0, timeout: 30_000 }),
    }),
  }));
}

export function lightAccountInitCode(implementation = IMPLEMENTATION) {
  const mem = new Uint8Array(0x80);
  const writeWord = (offset, word) => {
    mem.set(toBytes(pad(word, { size: 32 })), offset);
  };
  writeWord(0x60, "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3");
  writeWord(0x40, "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076");
  writeWord(0x20, "0x6009");
  mem.set(toBytes(pad(implementation, { size: 32 })), 0x1e);
  writeWord(0x0a, "0x603d3d8160223d3973");
  return toHex(mem.slice(0x21, 0x21 + 0x5f));
}

export function lightAccountAddress(owner, factory = FACTORY) {
  const combinedSalt = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [getAddress(owner), 0n],
    ),
  );
  return getContractAddress({
    opcode: "CREATE2",
    from: factory,
    salt: combinedSalt,
    bytecode: lightAccountInitCode(),
  });
}

/** Empty code is an EOA. EIP-7702 delegation code (0xef0100 + address) still is. */
export function isContractCode(code) {
  if (!code || code === "0x") return false;
  const lower = code.toLowerCase();
  if (lower.startsWith("0xef0100") && lower.length === 2 + 23 * 2) return false;
  return true;
}

/**
 * Reads the block cap out of the many ways providers say "range too big".
 * Returns the cap, 0 when the provider rejects the range without a number,
 * or undefined when the error is not about the range.
 */
export function rangeLimitFromError(error) {
  const text = [error?.details, error?.shortMessage, error?.message]
    .filter(Boolean)
    .join(" ");
  const patterns = [
    /limited to 0 - (\d+) blocks/i,
    /ranges over (\d+) blocks/i,
    /max range:?\s*(\d+)/i,
    /up to a (\d+) block range/i,
    /block range (?:is )?(?:too large|exceeds)[^\d]*(\d+)/i,
    /range (?:should|must) (?:not )?(?:exceed|be less than)[^\d]*(\d+)/i,
    /maximum block range[^\d]*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  if (/range too large|block range|too many blocks/i.test(text)) return 0;
  return undefined;
}

/** True when the provider cannot serve history at all (not worth retrying). */
export function isHistoryError(error) {
  const text = [error?.details, error?.shortMessage, error?.message]
    .filter(Boolean)
    .join(" ");
  return /archive|pruned|personal token|history unavailable/i.test(text);
}

export function splitRange(from, to, size) {
  const ranges = [];
  for (let start = from; start <= to; start += size) {
    const end = start + size - 1n > to ? to : start + size - 1n;
    ranges.push([start, end]);
  }
  return ranges;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Scans [fromBlock, toBlock] in chunks, rotating endpoints. An endpoint
 * that caps the range is remembered with its cap; ranges larger than any
 * live endpoint can serve are split. An endpoint without history is
 * dropped. Other errors back off and retry on the next endpoint. Throws
 * when no endpoint can finish a range: there is no silent fallback.
 */
export async function scanLogs({
  endpoints,
  address,
  event,
  fromBlock,
  toBlock,
  chunkSize = 10_000n,
  minChunk = 500n,
  maxAttempts = 8,
  maxEndpointFailures = 3,
  baseDelayMs = 500,
  log = () => {},
  wait = sleep,
}) {
  const state = endpoints.map((endpoint) => ({
    ...endpoint,
    cap: chunkSize,
    dead: false,
    failures: 0,
  }));
  const queue = splitRange(fromBlock, toBlock, chunkSize).map((range) => ({
    range,
    attempts: 0,
  }));
  const logs = [];
  let cursor = 0;
  let requests = 0;

  while (queue.length > 0) {
    const item = queue.shift();
    const [start, end] = item.range;
    const size = end - start + 1n;
    const live = state.filter((endpoint) => !endpoint.dead);
    if (live.length === 0) {
      throw new Error(`No RPC can serve logs for ${start}-${end}`);
    }
    const bestCap = live.reduce((max, endpoint) => (endpoint.cap > max ? endpoint.cap : max), 0n);
    if (size > bestCap) {
      queue.unshift(...splitRange(start, end, bestCap).map((range) => ({ range, attempts: 0 })));
      continue;
    }
    const fitting = live.filter((endpoint) => endpoint.cap >= size);
    const endpoint = fitting[cursor++ % fitting.length];
    requests++;
    try {
      const chunk = await endpoint.client.getLogs({
        address,
        event,
        fromBlock: start,
        toBlock: end,
        strict: true,
      });
      endpoint.failures = 0;
      logs.push(...chunk);
    } catch (error) {
      const limit = rangeLimitFromError(error);
      if (limit !== undefined) {
        const cap = limit > 0 ? BigInt(limit) : size / 2n;
        endpoint.cap = cap < size ? cap : size - 1n;
        if (endpoint.cap < minChunk) {
          endpoint.dead = true;
          log(`  ${endpoint.label}: log range capped at ${limit}, not used for the scan`);
        } else {
          log(`  ${endpoint.label}: log range capped at ${endpoint.cap}`);
        }
        queue.unshift(item);
        continue;
      }
      if (isHistoryError(error)) {
        endpoint.dead = true;
        log(`  ${endpoint.label}: no log history, not used for the scan`);
        queue.unshift(item);
        continue;
      }
      endpoint.failures++;
      if (endpoint.failures >= maxEndpointFailures) {
        endpoint.dead = true;
        log(`  ${endpoint.label}: ${endpoint.failures} failures in a row, not used for the scan`);
      }
      item.attempts++;
      if (item.attempts >= maxAttempts * endpoints.length) {
        throw new Error(
          `getLogs ${start}-${end} failed ${item.attempts} times: ${error.shortMessage || error.message}`,
        );
      }
      const delay = baseDelayMs * 2 ** Math.min(item.attempts - 1, 5);
      log(`  ${endpoint.label}: ${error.shortMessage || error.message} (retry in ${delay}ms)`);
      await wait(delay);
      queue.unshift(item);
    }
  }
  return { logs, requests };
}

/** First endpoint that answers wins; the rest are tried in order. */
export async function withFallback(endpoints, run, { log = () => {}, attempts = 2 } = {}) {
  let lastError;
  for (let round = 0; round < attempts; round++) {
    for (const endpoint of endpoints) {
      try {
        return await run(endpoint.client, endpoint);
      } catch (error) {
        lastError = error;
        log(`  ${endpoint.label}: ${error.shortMessage || error.message}`);
      }
    }
    await sleep(500 * (round + 1));
  }
  throw lastError;
}

/** Runs multicalls in chunks, each chunk with endpoint fallback. */
export async function multicallAll(endpoints, contracts, { chunk = 50, log } = {}) {
  const results = [];
  for (let index = 0; index < contracts.length; index += chunk) {
    const slice = contracts.slice(index, index + chunk);
    const part = await withFallback(
      endpoints,
      (client) => client.multicall({ contracts: slice, allowFailure: false }),
      { log },
    );
    results.push(...part);
  }
  return results;
}

/**
 * A badge is migratable by the Safe when the Safe can both mint and burn
 * it through held-badge rules, and it is not a profile, a community
 * badge, a hooked badge, or a badge the Safe itself holds (the Safe's
 * own credentials stay put). Credential badges, the ones official badges'
 * mint or burn rules point at (Security Council 12 on mainnet), are left
 * for their holders to move deliberately unless `includeCredentials`.
 * Only official badges count: anyone can create a non-official badge whose
 * rules name any id, which must not be able to drop a badge from the batch.
 */
export function selectMigratable(badges, heldIds, { includeCredentials = false } = {}) {
  const held = new Set(heldIds.map((id) => BigInt(id)));
  const credentials = new Set(
    badges
      .filter((badge) => badge.isOfficial === true)
      .flatMap((badge) => [...badge.minters, ...badge.burners].map((rule) => BigInt(rule))),
  );
  const intersects = (rules) => rules.some((rule) => held.has(BigInt(rule)));
  const result = [];
  const reasons = {};
  for (const badge of badges) {
    const id = BigInt(badge.id);
    const why = [];
    if (badge.isProfile) why.push("profile");
    if (badge.isCommunity) why.push("community");
    if (held.has(id)) why.push("held by the Safe");
    if (badge.hook && BigInt(badge.hook) !== 0n) why.push("has a hook");
    if (!intersects(badge.minters)) why.push("Safe cannot mint");
    if (!intersects(badge.burners)) why.push("Safe cannot burn");
    if (!includeCredentials && credentials.has(id)) why.push("credential for other badges");
    if (why.length === 0) result.push(id);
    else reasons[id.toString()] = why;
  }
  return { migratable: result, reasons };
}

export function sameIdSet(a, b) {
  const left = [...new Set(a.map(String))].sort();
  const right = [...new Set(b.map(String))].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function parseIdList(value) {
  if (value === undefined || value === true) return undefined;
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (!/^\d+$/.test(part)) throw new Error(`Bad badge id ${part}`);
      return BigInt(part);
    });
}

export function safeCall(to, abi, functionName, args, values) {
  return {
    to,
    value: "0",
    data: encodeFunctionData({ abi, functionName, args }),
    contractMethod: {
      inputs: abi.find((item) => item.name === functionName).inputs,
      name: functionName,
      payable: false,
    },
    contractInputsValues: values,
  };
}

export const createAccountCall = (owner) =>
  safeCall(FACTORY, factoryAbi, "createAccount", [owner, 0n], {
    owner,
    salt: "0",
  });

export const mintCall = (badges, to, id, amount) =>
  safeCall(badges, badgesAbi, "mint", [to, id, amount, "0x"], {
    to,
    id: id.toString(),
    amount: amount.toString(),
    data: "0x",
  });

export const burnCall = (badges, from, id, value) =>
  safeCall(badges, badgesAbi, "burn", [from, id, value], {
    from,
    id: id.toString(),
    value: value.toString(),
  });

/**
 * Per member: deploy S when it has no code, mint what S is missing, then
 * burn everything from E. Returns the forward calls and the plan used
 * by the rollback and the report.
 */
export function planMember({ badges, eoa, smart, smartDeployed, balances }) {
  const forward = [];
  const moved = [];
  if (!smartDeployed) forward.push(createAccountCall(eoa));
  for (const { id, onOld, onSmart } of balances) {
    if (onOld === 0n) continue;
    const missing = onOld > onSmart ? onOld - onSmart : 0n;
    if (missing > 0n) forward.push(mintCall(badges, smart, id, missing));
    forward.push(burnCall(badges, eoa, id, onOld));
    moved.push({ id: id.toString(), amount: onOld.toString(), minted: missing.toString() });
  }
  return { forward, moved };
}

/** Undo for one member: give E back what was burned, take back from S what was minted. */
export function rollbackCalls({ badges, eoa, smart, moved }) {
  const calls = [];
  for (const entry of moved) {
    const id = BigInt(entry.id);
    calls.push(mintCall(badges, eoa, id, BigInt(entry.amount)));
    if (BigInt(entry.minted) > 0n) calls.push(burnCall(badges, smart, id, BigInt(entry.minted)));
  }
  return calls;
}

export function chunkMembers(members, size) {
  if (!size) return [members];
  const chunks = [];
  for (let index = 0; index < members.length; index += size) {
    chunks.push(members.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

export function safeBatch({ chainId, safe, name, description, transactions, createdAt = Date.now() }) {
  return {
    version: "1.0",
    chainId: String(chainId),
    createdAt,
    meta: {
      name,
      description,
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: safe,
      createdFromOwnerAddress: "",
    },
    transactions,
  };
}

/** Batch file names for a chain; split batches get a part suffix. */
export function batchFileNames(chain, parts) {
  const names = (stem) =>
    parts <= 1
      ? [`${stem}.${chain}.json`]
      : Array.from({ length: parts }, (_, index) => `${stem}.${chain}.part-${index + 1}-of-${parts}.json`);
  return {
    forward: names("safe-smart-account-migration"),
    rollback: names("safe-smart-account-migration.rollback"),
    report: `smart-account-migration-report.${chain}.json`,
  };
}

/** Files a previous run for this chain may have left (any split). */
export function isStaleBatchFile(file, chain) {
  if (file === "safe-smart-account-migration.json") return true;
  if (file === "smart-account-migration-report.json") return true;
  const pattern = new RegExp(
    `^safe-smart-account-migration(\\.rollback)?\\.${chain}(\\.part-\\d+-of-\\d+)?\\.json$`,
  );
  return pattern.test(file);
}

/**
 * Replaces one chain's entry of a chain-keyed map. A legacy flat map
 * (eoa => smart) is treated as mainnet, which is where it came from.
 */
export function mergeChainMap(existing, chainId, entries) {
  const isFlat =
    existing &&
    Object.keys(existing).length > 0 &&
    Object.keys(existing).every((key) => key.startsWith("0x"));
  const base = isFlat ? { 1: existing } : { ...(existing ?? {}) };
  base[String(chainId)] = entries;
  base["1"] ??= {};
  base["11155111"] ??= {};
  const ordered = {};
  for (const key of Object.keys(base).sort((a, b) => Number(a) - Number(b))) {
    ordered[key] = base[key];
  }
  return ordered;
}
