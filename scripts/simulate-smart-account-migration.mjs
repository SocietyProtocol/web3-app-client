/**
 * Simulate a migration batch read-only: every transaction is run in order
 * with the Safe as msg.sender through eth_simulateV1, so later calls see
 * the accounts and mints of earlier ones. Nothing is signed or sent.
 *
 *   node scripts/simulate-smart-account-migration.mjs [--chain mainnet|sepolia]
 *     [--file <batch.json>] [--rollback]
 *
 * Without --file it runs the forward batches (or, with --rollback, the
 * forward batches followed by the rollback batches) named in the chain's
 * report. Exits non-zero if any call reverts.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { numberToHex } from "viem";
import { chainConfig, makeClients, parseArgs, rpcList } from "./smart-account-migration-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const config = chainConfig(args.chain === undefined ? "mainnet" : String(args.chain));
const outDir = resolve(here, "../../web3-app-contracts/script-output");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

let files;
if (typeof args.file === "string") {
  files = [resolve(process.cwd(), args.file)];
} else {
  const report = readJson(resolve(outDir, `smart-account-migration-report.${config.name}.json`));
  files = [...report.batches, ...(args.rollback ? report.rollbackBatches : [])].map((name) =>
    resolve(outDir, name),
  );
}

const batches = files.map(readJson);
for (const batch of batches) {
  if (batch.chainId !== String(config.chain.id)) {
    throw new Error(`Batch chainId ${batch.chainId} is not ${config.name}`);
  }
}
const safe = batches[0].meta.createdFromSafeAddress;
const transactions = batches.flatMap((batch) => batch.transactions);

// One block per transaction keeps each call's gas separate and gives a
// generous per-block gas limit; state carries between blocks.
const blockStateCalls = transactions.map((tx) => ({
  calls: [{ from: safe, to: tx.to, data: tx.data, value: numberToHex(BigInt(tx.value)) }],
}));

const endpoints = makeClients(config, rpcList(config));
let results;
let used;
for (const endpoint of endpoints) {
  try {
    results = await endpoint.client.request({
      method: "eth_simulateV1",
      params: [{ blockStateCalls, validation: false, traceTransfers: false }, "latest"],
    });
    used = endpoint.label;
    break;
  } catch (error) {
    console.log(`  ${endpoint.label}: ${error.shortMessage || error.message}`);
  }
}
if (!results) {
  console.error("No RPC answered eth_simulateV1");
  process.exit(1);
}

let gas = 0n;
let failed = 0;
results.forEach((block, index) => {
  const call = block.calls[0];
  const tx = transactions[index];
  const used = BigInt(call.gasUsed);
  gas += used;
  const ok = call.status === "0x1";
  if (!ok) failed++;
  const values = Object.values(tx.contractInputsValues ?? {}).join(" ");
  if (!ok || args.verbose) {
    console.log(
      `${String(index + 1).padStart(4)} ${ok ? "ok    " : "REVERT"} ${String(used).padStart(8)}  ${tx.contractMethod.name} ${values}${ok ? "" : ` ${call.error?.message ?? call.returnData}`}`,
    );
  }
});

console.log(`rpc ${used}`);
console.log(`safe ${safe}`);
console.log(`files ${files.map((file) => file.split("/").pop()).join(", ")}`);
console.log(`calls ${transactions.length}, reverted ${failed}`);
console.log(`gas used ${gas} (sum of calls; the Safe's MultiSend adds some on top)`);
process.exit(failed ? 1 : 0);
