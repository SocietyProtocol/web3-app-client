/**
 * Check on-chain that a migration batch landed: every Light Account in the
 * chain's report has code and holds the badges moved to it, and every old
 * wallet holds none of the migrated badge ids. Read-only.
 *
 *   node scripts/verify-smart-account-migration.mjs [--chain mainnet|sepolia] [--report <path>]
 *
 * Prints one row per member and exits non-zero on any mismatch.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  badgesAbi,
  chainConfig,
  isContractCode,
  makeClients,
  multicallAll,
  parseArgs,
  rpcList,
  withFallback,
} from "./smart-account-migration-lib.mjs";

/**
 * Compares what the report expects with what the chain says. `balances`
 * maps `${account.toLowerCase()}:${id}` to a bigint.
 */
export function checkMember(member, migratableIds, { smartCode, balances }) {
  const problems = [];
  const balance = (account, id) => balances.get(`${account.toLowerCase()}:${id}`) ?? 0n;
  if (!isContractCode(smartCode)) problems.push("smart account has no code");
  for (const entry of member.moved) {
    const held = balance(member.smart, entry.id);
    if (held < BigInt(entry.amount)) {
      problems.push(`smart holds ${held} of #${entry.id}, expected ${entry.amount}`);
    }
  }
  for (const id of migratableIds) {
    const left = balance(member.eoa, id);
    if (left !== 0n) problems.push(`old wallet still holds ${left} of #${id}`);
  }
  return problems;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const args = parseArgs(process.argv.slice(2));
  const config = chainConfig(args.chain === undefined ? "mainnet" : String(args.chain));
  const reportPath =
    typeof args.report === "string"
      ? resolve(process.cwd(), args.report)
      : resolve(here, `../../web3-app-contracts/script-output/smart-account-migration-report.${config.name}.json`);
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (report.chainId !== config.chain.id) {
    throw new Error(`Report is for chain ${report.chainId}, not ${config.name}`);
  }

  const endpoints = makeClients(config, rpcList(config));
  const ids = report.migratableBadges.map(BigInt);
  const pairs = report.members.flatMap((member) => [
    ...ids.map((id) => [member.eoa, id]),
    ...member.moved.map((entry) => [member.smart, BigInt(entry.id)]),
  ]);
  const values = await multicallAll(
    endpoints,
    pairs.map(([account, id]) => ({
      address: report.badges,
      abi: badgesAbi,
      functionName: "balanceOf",
      args: [account, id],
    })),
    { chunk: 40 },
  );
  const balances = new Map(
    pairs.map(([account, id], index) => [`${account.toLowerCase()}:${id}`, values[index]]),
  );

  let bad = 0;
  const rows = [];
  for (const member of report.members) {
    const smartCode = await withFallback(endpoints, (client) =>
      client.getCode({ address: member.smart }),
    );
    const problems = checkMember(member, ids, { smartCode, balances });
    if (problems.length) bad++;
    rows.push({
      profile: `#${member.profileId}`,
      eoa: member.eoa,
      smart: member.smart,
      code: isContractCode(smartCode) ? "yes" : "no",
      moved: member.moved.map((entry) => `${entry.id}x${entry.amount}`).join(" ") || "-",
      status: problems.length ? problems.join("; ") : "ok",
    });
  }

  console.table(rows);
  console.log(`${config.name}: ${report.members.length - bad}/${report.members.length} members ok`);
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
