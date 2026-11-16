#!/usr/bin/env node
// Refreshes the gateway snapshot of the subgraph fake (see README.md here).
//
//   node e2e/support/backends/gateway/refresh.mjs [--subgraph <checkout>] [--ref <git ref>] [--check] [--accept-validator]
//
// --subgraph  a local clone of web3-app-subgraph (default: ../web3-app-subgraph
//             next to this repository). Fetch it first: the ref is read with
//             `git show`, the working tree is not looked at.
// --ref       the commit, branch or tag to copy from (default: origin/staging,
//             the gateway that staging runs).
// --check     change nothing; exit 1 if the snapshot differs from the ref.
// --accept-validator
//             record the gateway's current validation code as ported. Only
//             after updating policy.mjs to match it.
//
// Copies infra/query-gateway/generated/registry.js verbatim to registry.cjs
// and records the source commit in source.json. It also hashes the gateway's
// validation functions in server.js: when they changed since policy.mjs was
// ported, the refresh stops and says so, because the fake would otherwise
// apply the new policy with the old rules.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const REGISTRY_PATH = "infra/query-gateway/generated/registry.js";
const SERVER_PATH = "infra/query-gateway/server.js";

/** The parts of server.js that policy.mjs ports, from the first marker up to (not including) the second. */
const PORTED_RANGES = [
  ["function rejectIntrospection(", "function readRequestBody("],
  ["function parseGraphQLRequest(", "async function readUpstreamBody("],
];

function parseArgs(argv) {
  const args = { subgraph: path.resolve(repoRoot, "../web3-app-subgraph"), ref: "origin/staging", check: false, acceptValidator: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--subgraph") args.subgraph = path.resolve(argv[++index]);
    else if (arg === "--ref") args.ref = argv[++index];
    else if (arg === "--check") args.check = true;
    else if (arg === "--accept-validator") args.acceptValidator = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

export function portedSource(serverSource) {
  return PORTED_RANGES.map(([start, end]) => {
    const from = serverSource.indexOf(start);
    const to = serverSource.indexOf(end, from);
    if (from < 0 || to < 0) throw new Error(`server.js no longer has ${start} ... ${end}: port policy.mjs again`);
    return serverSource.slice(from, to);
  }).join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const commit = git(args.subgraph, "rev-parse", "--verify", `${args.ref}^{commit}`).trim();
  const registry = git(args.subgraph, "show", `${commit}:${REGISTRY_PATH}`);
  const validatorSha256 = sha256(portedSource(git(args.subgraph, "show", `${commit}:${SERVER_PATH}`)));

  const sourceFile = path.join(here, "source.json");
  const registryFile = path.join(here, "registry.cjs");
  const previous = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  const registrySha256 = sha256(registry);

  if (args.check) {
    const current = sha256(fs.readFileSync(registryFile, "utf8"));
    const problems = [];
    if (current !== registrySha256) problems.push(`registry.cjs differs from ${REGISTRY_PATH} at ${args.ref} (${commit.slice(0, 12)})`);
    if (previous.validatorSha256 !== validatorSha256) problems.push(`the gateway's validation code at ${args.ref} differs from the one policy.mjs ports`);
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
    console.log(`The snapshot matches ${args.ref} (${commit.slice(0, 12)}).`);
    return;
  }

  if (previous.validatorSha256 !== validatorSha256 && !args.acceptValidator) {
    console.error(
      [
        `The gateway's validation code in ${SERVER_PATH} changed since policy.mjs was ported`,
        `(ported: ${previous.validatorCommit.slice(0, 12)}, now: ${commit.slice(0, 12)}).`,
        `Compare: git -C ${args.subgraph} diff ${previous.validatorCommit} ${commit} -- ${SERVER_PATH}`,
        "Port the change to policy.mjs, then run this again with --accept-validator.",
      ].join("\n"),
    );
    process.exit(1);
  }

  fs.writeFileSync(registryFile, registry);
  const source = {
    repository: "web3-app-subgraph",
    path: REGISTRY_PATH,
    ref: args.ref,
    commit,
    registrySha256,
    validatorCommit: previous.validatorSha256 === validatorSha256 ? previous.validatorCommit : commit,
    validatorSha256,
  };
  fs.writeFileSync(sourceFile, `${JSON.stringify(source, null, 2)}\n`);
  console.log(`registry.cjs now holds ${REGISTRY_PATH} of ${args.ref} (${commit.slice(0, 12)}).`);
  if (previous.registrySha256 === registrySha256) console.log("(unchanged)");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
