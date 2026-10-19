/**
 * Build the admin Safe batch that deploys each member's Light Account and
 * moves the badges the Safe is allowed to mint and burn. Does not broadcast.
 *
 *   node scripts/migrate-to-smart-accounts.mjs [--chain mainnet|sepolia]
 *     [--safe <address|ens>] [--badges 13,24] [--split <members per batch>]
 *     [--include-credentials] [--force] [--dry-run]
 *   RPC_URL=https://... node scripts/migrate-to-smart-accounts.mjs --chain sepolia --safe 0x...
 *
 * Mainnet defaults to the DAO Safe (societyprotocol.eth). Sepolia needs
 * --safe. Import the written JSON in the Safe Transaction Builder of that
 * Safe. Do not run this from a personal key.
 *
 * Writes, per chain (web3-app-contracts/script-output/):
 *   safe-smart-account-migration.<chain>[.part-i-of-n].json
 *   safe-smart-account-migration.rollback.<chain>[.part-i-of-n].json
 *   smart-account-migration-report.<chain>.json
 * and this chain's key of src/consts/legacy-account-map.json and
 * discourse-siwe-auth/script/forum-address-map.json.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress, isAddress } from "viem";
import { normalize } from "viem/ens";
import {
  EXPECTED_MAINNET_MIGRATABLE,
  FACTORY,
  IMPLEMENTATION,
  badgesAbi,
  batchFileNames,
  chainConfig,
  chunkMembers,
  factoryAbi,
  isContractCode,
  isStaleBatchFile,
  lightAccountAddress,
  makeClients,
  mergeChainMap,
  multicallAll,
  parseArgs,
  parseIdList,
  planMember,
  profileCreatedEvent,
  rollbackCalls,
  rpcList,
  safeBatch,
  sameIdSet,
  scanLogs,
  selectMigratable,
  withFallback,
} from "./smart-account-migration-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const config = chainConfig(args.chain === undefined ? "mainnet" : String(args.chain));
const chainId = config.chain.id;
const dryRun = args["dry-run"] === true;
const split = args.split === undefined ? 0 : Number(args.split);
if (!Number.isInteger(split) || split < 0) throw new Error("--split takes a positive member count");

const log = (...line) => console.log(...line);
const quiet = (line) => console.log(line);
const endpoints = makeClients(config, rpcList(config));
const read = (run) => withFallback(endpoints, run, { log: quiet });

log(`chain ${config.name} (${chainId})`);
log(`rpcs ${endpoints.map((endpoint) => endpoint.label).join(", ")}`);

// The local CREATE2 math must match the factory before anything is trusted.
const sample = getAddress("0x0000000000000000000000000000000000000001");
const onChain = await read((client) =>
  client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "getAddress", args: [sample, 0n] }),
);
if (getAddress(onChain) !== lightAccountAddress(sample)) {
  throw new Error("Local Light Account address does not match the factory");
}

async function resolveSafe() {
  const value = args.safe === undefined || args.safe === true ? config.defaultSafeEns : String(args.safe);
  if (!value) throw new Error(`--safe <address> is required on ${config.name}`);
  if (isAddress(value)) return { safe: getAddress(value), safeName: undefined };
  if (config.name !== "mainnet") throw new Error(`--safe must be an address on ${config.name}`);
  const resolved = await read((client) => client.getEnsAddress({ name: normalize(value) }));
  if (!resolved) throw new Error(`${value} does not resolve`);
  return { safe: getAddress(resolved), safeName: value };
}

const { safe, safeName } = await resolveSafe();
const safeCode = await read((client) => client.getCode({ address: safe }));
if (!isContractCode(safeCode)) log(`warning: ${safe} has no contract code; is it really a Safe?`);
log(`safe ${safe}${safeName ? ` (${safeName})` : ""}`);

const toBlock = await read((client) => client.getBlockNumber());
const nextTokenId = await read((client) =>
  client.readContract({ address: config.badges, abi: badgesAbi, functionName: "nextTokenId" }),
);
log(`badges ${config.badges}, nextTokenId ${nextTokenId}, head ${toBlock}`);

// nextTokenId is the most recently assigned id (_badgeExists: id <= nextTokenId),
// so the range is inclusive.
const ids = Array.from({ length: Number(nextTokenId) }, (_, index) => BigInt(index + 1));
const perBadge = (functionName, extra = []) =>
  ids.map((id) => ({ address: config.badges, abi: badgesAbi, functionName, args: [...extra, id] }));
const [isProfile, info, minters, burners, safeBalances] = await Promise.all([
  multicallAll(endpoints, perBadge("isProfileBadge"), { log: quiet }),
  multicallAll(endpoints, perBadge("badges"), { log: quiet }),
  multicallAll(endpoints, perBadge("getBadgeMinters"), { log: quiet }),
  multicallAll(endpoints, perBadge("getBadgeBurners"), { log: quiet }),
  multicallAll(endpoints, perBadge("balanceOf", [safe]), { log: quiet }),
]);
const badgeRows = ids.map((id, index) => ({
  id,
  name: info[index][0],
  hook: info[index][1],
  isOfficial: info[index][2],
  isCommunity: info[index][3],
  isProfile: isProfile[index],
  minters: minters[index],
  burners: burners[index],
  safeBalance: safeBalances[index],
}));
const profileIds = badgeRows.filter((row) => row.isProfile).map((row) => row.id);
const heldIds = badgeRows.filter((row) => row.safeBalance > 0n).map((row) => row.id);
log(`profile badges ${profileIds.length}, safe holds [${heldIds.join(", ")}]`);

// Profiles come from ProfileCreated, scanned in chunks from the deploy block.
log(`scanning ProfileCreated ${config.deployBlock}-${toBlock}`);
const scan = await scanLogs({
  endpoints,
  address: config.badges,
  event: profileCreatedEvent,
  fromBlock: config.deployBlock,
  toBlock,
  log: quiet,
});
const byId = new Map();
for (const entry of scan.logs) byId.set(entry.args.id, getAddress(entry.args.user));
log(`ProfileCreated ${scan.logs.length} logs in ${scan.requests} requests`);

const logIds = [...byId.keys()];
if (!sameIdSet(logIds, profileIds)) {
  const missing = profileIds.filter((id) => !byId.has(id));
  const extra = logIds.filter((id) => !profileIds.includes(id));
  console.error(
    `Profile count mismatch: ${logIds.length} from logs, ${profileIds.length} by isProfileBadge.` +
      ` missing [${missing.join(", ")}] extra [${extra.join(", ")}]`,
  );
  process.exit(1);
}

const auto = selectMigratable(
  badgeRows.filter((row) => row.id > 10n),
  heldIds,
  { includeCredentials: args["include-credentials"] === true },
);
const override = parseIdList(args.badges);
const migratable = override ?? auto.migratable;
if (override) {
  log(`badges overridden: [${override.join(", ")}] (discovered [${auto.migratable.join(", ")}])`);
} else {
  log(`migratable [${migratable.join(", ")}]`);
}
// A changed mainnet set needs a human: pass --badges to pick the set, or
// --force to accept what was discovered.
if (config.name === "mainnet" && !sameIdSet(auto.migratable, EXPECTED_MAINNET_MIGRATABLE)) {
  const message = `discovered [${auto.migratable.join(", ")}], expected [${EXPECTED_MAINNET_MIGRATABLE.join(", ")}]`;
  if (!override && args.force !== true) {
    console.error(`${message}. Check the reasons below, then rerun with --badges or --force.`);
    for (const [id, why] of Object.entries(auto.reasons)) {
      if (EXPECTED_MAINNET_MIGRATABLE.includes(BigInt(id))) console.error(`  ${id}: ${why.join(", ")}`);
    }
    process.exit(1);
  }
  log(`warning: ${message}`);
}

// Owners that are contracts (a Safe, a multisig) cannot sign as a Light
// Account owner. 7702-delegated EOAs still can.
const owners = [...byId.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
const ownerCodes = [];
const smartCodes = [];
for (const [, eoa] of owners) {
  ownerCodes.push(await read((client) => client.getCode({ address: eoa })));
  smartCodes.push(await read((client) => client.getCode({ address: lightAccountAddress(eoa) })));
}
const skippedContracts = [];
const rows = [];
owners.forEach(([profileId, eoa], index) => {
  if (isContractCode(ownerCodes[index])) {
    skippedContracts.push({ eoa, profileId: profileId.toString() });
    log(`skip ${eoa} (profile #${profileId}): owner is a contract`);
    return;
  }
  const smart = lightAccountAddress(eoa);
  rows.push({ eoa, smart, profileId, smartDeployed: isContractCode(smartCodes[index]) });
});

const balanceCalls = rows.flatMap((row) =>
  migratable.flatMap((id) => [
    { address: config.badges, abi: badgesAbi, functionName: "balanceOf", args: [row.eoa, id] },
    { address: config.badges, abi: badgesAbi, functionName: "balanceOf", args: [row.smart, id] },
  ]),
);
const balances = await multicallAll(endpoints, balanceCalls, { chunk: 40, log: quiet });

let cursor = 0;
const members = rows.map((row) => {
  const memberBalances = migratable.map((id) => ({
    id,
    onOld: balances[cursor++],
    onSmart: balances[cursor++],
  }));
  const { forward, moved } = planMember({
    badges: config.badges,
    eoa: row.eoa,
    smart: row.smart,
    smartDeployed: row.smartDeployed,
    balances: memberBalances,
  });
  const rollback = rollbackCalls({ badges: config.badges, eoa: row.eoa, smart: row.smart, moved });
  return { ...row, forward, rollback, moved };
});

const parts = chunkMembers(members, split);
const names = batchFileNames(config.name, parts.length);
const createdAt = Date.now();
const forwardBatches = parts.map((part, index) =>
  safeBatch({
    chainId,
    safe,
    createdAt,
    name: `Outpost smart account migration (${config.name}${parts.length > 1 ? `, ${index + 1}/${parts.length}` : ""})`,
    description:
      "Deploy each member Light Account, mint Safe-movable badges onto it, and burn those badges from the old wallet. Profiles, community, hooked, and Safe-held badges are not included.",
    transactions: part.flatMap((member) => member.forward),
  }),
);
const rollbackBatches = parts.map((part, index) =>
  safeBatch({
    chainId,
    safe,
    createdAt,
    name: `Outpost smart account migration ROLLBACK (${config.name}${parts.length > 1 ? `, ${index + 1}/${parts.length}` : ""})`,
    description:
      "Undo the migration batch: mint the moved badges back to each old wallet and burn what was minted from its Light Account. Deployed Light Accounts stay deployed.",
    transactions: part.flatMap((member) => member.rollback),
  }),
);

const legacyEntries = {};
for (const member of members) legacyEntries[member.eoa.toLowerCase()] = member.smart;

const report = {
  chain: config.name,
  chainId,
  safe,
  safeName,
  badges: config.badges,
  factory: FACTORY,
  implementation: IMPLEMENTATION,
  scannedBlocks: { from: config.deployBlock.toString(), to: toBlock.toString() },
  nextTokenId: nextTokenId.toString(),
  profileCount: profileIds.length,
  safeHeldBadges: heldIds.map(String),
  migratableBadges: migratable.map(String),
  badgesOverridden: Boolean(override),
  // Profile badges are listed once in profileCount, not per id.
  notMigratable: Object.fromEntries(
    Object.entries(auto.reasons).filter(([, why]) => !why.includes("profile")),
  ),
  memberCount: members.length,
  transactionCount: forwardBatches.reduce((sum, batch) => sum + batch.transactions.length, 0),
  rollbackTransactionCount: rollbackBatches.reduce((sum, batch) => sum + batch.transactions.length, 0),
  batches: names.forward,
  rollbackBatches: names.rollback,
  skippedContracts,
  notMoved: [
    "Profile badges cannot be burned or transferred.",
    "Community badges are minted by the community manager, not the Safe.",
    "Hooked badges (e.g. VIP, following the SPEC lock) are decided by their hook.",
    "Badges the Safe holds stay where they are.",
    "Credential badges other badges depend on (Security Council 12) are moved by their holders.",
    "SPEC, VIP locks, and ETH stay on the old wallet.",
  ],
  members: members.map((member, index) => ({
    eoa: member.eoa,
    smart: member.smart,
    profileId: member.profileId.toString(),
    smartDeployed: member.smartDeployed,
    batch: split ? Math.floor(index / split) + 1 : 1,
    moved: member.moved,
  })),
};

log(`members ${members.length}, skipped contracts ${skippedContracts.length}`);
log(`safe transactions ${report.transactionCount}, rollback ${report.rollbackTransactionCount}`);

if (dryRun) {
  log("dry run: nothing written");
  process.exit(0);
}

const outDir = resolve(here, "../../web3-app-contracts/script-output");
const mapPaths = [
  resolve(here, "../src/consts/legacy-account-map.json"),
  resolve(here, "../../discourse-siwe-auth/script/forum-address-map.json"),
];
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) {
  if (isStaleBatchFile(file, config.name)) rmSync(resolve(outDir, file));
}
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
forwardBatches.forEach((batch, index) => writeJson(resolve(outDir, names.forward[index]), batch));
rollbackBatches.forEach((batch, index) => writeJson(resolve(outDir, names.rollback[index]), batch));
writeJson(resolve(outDir, names.report), report);
for (const path of mapPaths) {
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  writeJson(path, mergeChainMap(existing, chainId, legacyEntries));
}

for (const name of [...names.forward, ...names.rollback, names.report]) log(resolve(outDir, name));
