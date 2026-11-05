/**
 * Build a Sepolia copy of the production situation before the smart-account
 * cutover, so the Safe migration can be rehearsed end to end on staging.
 *
 *   REHEARSAL_KEYS=/path/to/keys.json node scripts/rehearsal/setup-sepolia-legacy.mjs
 *
 * It creates, with throwaway keys kept outside git:
 *   - a 1-of-2 Safe (owners: SAFE_OWNER and the funder key), like the Security Council
 *   - "[Rehearsal] SP DAO" held by that Safe, standing in for badge 11
 *   - "[Rehearsal] Governor" and "[Rehearsal] Core Team", mintable and burnable only by it
 *   - three legacy MetaMask-style accounts with profiles, role badges,
 *     one community managed by Alice with Bob as member, and an invite Alice -> Carol
 *
 * Every step is idempotent: progress is saved next to the keys file.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  parseEther,
  formatEther,
  zeroAddress,
  pad,
  concat,
  decodeEventLog,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPC = process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const KEYS = process.env.REHEARSAL_KEYS;
const SAFE_OWNER = process.env.SAFE_OWNER || "0xa651c309aedEcd6e6347c9eF390afd18986f25AD";
if (!KEYS) throw new Error("Set REHEARSAL_KEYS to a JSON file outside the repo");
const STATE = KEYS.replace(/\.json$/, "") + ".state.json";

const BADGES = "0x12406bB6d11Cb641e100F1d8595c0C5e63F0bD47";
const REGISTRY = "0xE517446f4AC1035E334B5AEc57941F2644BA8639";
const SAFE_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
const SAFE_L2 = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
const SAFE_FALLBACK = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";
const PERM_SELF = 1n;

const badgesAbi = parseAbi([
  "function createBadge(string name,bool isOfficial,bool isCommunityBadge,address hook,string metadataURI,uint256[] minters,uint256[] transferers,uint256[] burners,address[] editors) returns (uint256)",
  "function createProfile(string metadataURI) returns (uint256)",
  "function profileBadgeId(address) view returns (uint256)",
  "function mint(address to,uint256 id,uint256 value,bytes data)",
  "function safeTransferFrom(address from,address to,uint256 id,uint256 value,bytes data)",
  "function balanceOf(address,uint256) view returns (uint256)",
  "function acceptInvite(address inviter,uint256 nonce,uint256 expiry,bytes signature)",
  "function hasInvited(address,address) view returns (bool)",
  "function uri(uint256) view returns (string)",
  "function isProfileBadge(uint256) view returns (bool)",
  "function nextTokenId() view returns (uint256)",
  "event BadgeCreated(uint256 indexed id, string name, bool isOfficial, bool isCommunityBadge, address creator)",
]);
const registryAbi = parseAbi([
  "function createCommunity(string name,string description,string managerBadgeURI,string assistantBadgeURI,string memberBadgeURI) returns (uint256)",
  "function communities(uint256) view returns (string name,string description,uint256 assistantBadgeId,uint256 memberBadgeId,address wrapper,uint256 createdAt)",
  "event CommunityCreated(uint256 indexed communityId, address indexed manager, uint256 assistantBadgeId, uint256 memberBadgeId)",
]);
const safeFactoryAbi = parseAbi([
  "function createProxyWithNonce(address singleton,bytes initializer,uint256 saltNonce) returns (address)",
  "event ProxyCreation(address indexed proxy, address singleton)",
]);
const safeAbi = parseAbi([
  "function setup(address[] owners,uint256 threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool)",
  "function getOwners() view returns (address[])",
]);

const keys = existsSync(KEYS)
  ? JSON.parse(readFileSync(KEYS, "utf8"))
  : { funder: generatePrivateKey(), alice: generatePrivateKey(), bob: generatePrivateKey(), carol: generatePrivateKey() };
writeFileSync(KEYS, JSON.stringify(keys, null, 2), { mode: 0o600 });
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const acct = Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, privateKeyToAccount(v)]));
const wallet = (who) => createWalletClient({ chain: sepolia, transport: http(RPC), account: acct[who] });

console.log("Funder:", acct.funder.address);
for (const who of ["alice", "bob", "carol"]) console.log(`Legacy ${who}:`, acct[who].address);

const funderBalance = await pub.getBalance({ address: acct.funder.address });
console.log("Funder balance:", formatEther(funderBalance), "ETH");
if (funderBalance < parseEther("0.12")) {
  console.log("Fund the funder address with at least 0.15 Sepolia ETH, then run this again.");
  process.exit(2);
}

async function send(who, request) {
  const hash = await wallet(who).writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${request.functionName} reverted: ${hash}`);
  return receipt;
}

async function step(name, fn) {
  if (state[name] !== undefined) return state[name];
  const value = await fn();
  state[name] = value ?? true;
  save();
  console.log("✓", name, value ?? "");
  return state[name];
}

// 1. Gas for the legacy wallets and for the Safe owner who executes the batch.
for (const [who, amount] of [["alice", "0.01"], ["bob", "0.006"], ["carol", "0.006"]]) {
  await step(`fund:${who}`, async () => {
    const hash = await wallet("funder").sendTransaction({ to: acct[who].address, value: parseEther(amount) });
    await pub.waitForTransactionReceipt({ hash });
  });
}
await step("fund:safeOwner", async () => {
  if ((await pub.getBalance({ address: SAFE_OWNER })) >= parseEther("0.03")) return "already funded";
  const hash = await wallet("funder").sendTransaction({ to: SAFE_OWNER, value: parseEther("0.04") });
  await pub.waitForTransactionReceipt({ hash });
});

// 2. The 1-of-2 Safe.
const safe = await step("safe", async () => {
  const initializer = encodeFunctionData({
    abi: safeAbi,
    functionName: "setup",
    args: [[SAFE_OWNER, acct.funder.address], 1n, zeroAddress, "0x", SAFE_FALLBACK, zeroAddress, 0n, zeroAddress],
  });
  const receipt = await send("funder", {
    address: SAFE_FACTORY,
    abi: safeFactoryAbi,
    functionName: "createProxyWithNonce",
    args: [SAFE_L2, initializer, 20261019n],
  });
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: safeFactoryAbi, ...log });
      if (ev.eventName === "ProxyCreation") return ev.args.proxy;
    } catch {}
  }
  throw new Error("No ProxyCreation event");
});

// Pre-validated signature: the funder is an owner and is msg.sender.
const approvedSig = concat([pad(acct.funder.address, { size: 32 }), pad("0x00", { size: 32 }), "0x01"]);
async function safeExec(to, data) {
  return send("funder", {
    address: safe,
    abi: safeAbi,
    functionName: "execTransaction",
    args: [to, 0n, data, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, approvedSig],
  });
}

async function createBadge(name, minters, transferers, burners) {
  const receipt = await send("funder", {
    address: BADGES,
    abi: badgesAbi,
    functionName: "createBadge",
    args: [name, false, false, zeroAddress, "", minters, transferers, burners, [acct.funder.address]],
  });
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: badgesAbi, ...log });
      if (ev.eventName === "BadgeCreated") return ev.args.id.toString();
    } catch {}
  }
  throw new Error(`No BadgeCreated for ${name}`);
}

// 3. Stand-ins for SP DAO (11) and two DAO-movable role badges.
const dao = await step("badge:dao", () => createBadge("[Rehearsal] SP DAO", [PERM_SELF], [PERM_SELF], []));
await step("dao:toSafe", async () => {
  await send("funder", { address: BADGES, abi: badgesAbi, functionName: "mint", args: [acct.funder.address, BigInt(dao), 1n, "0x"] });
  await send("funder", { address: BADGES, abi: badgesAbi, functionName: "safeTransferFrom", args: [acct.funder.address, safe, BigInt(dao), 1n, "0x"] });
});
const governor = await step("badge:governor", () => createBadge("[Rehearsal] Governor", [BigInt(dao)], [], [BigInt(dao)]));
const coreTeam = await step("badge:coreTeam", () => createBadge("[Rehearsal] Core Team", [BigInt(dao)], [], [BigInt(dao)]));

// 4. Legacy profiles. Reuse metadata already pinned for existing Sepolia profiles.
const metadata = await step("metadataUris", async () => {
  const next = await pub.readContract({ address: BADGES, abi: badgesAbi, functionName: "nextTokenId" });
  const uris = [];
  for (let id = 1n; id <= next && uris.length < 3; id++) {
    if (!(await pub.readContract({ address: BADGES, abi: badgesAbi, functionName: "isProfileBadge", args: [id] }))) continue;
    const uri = await pub.readContract({ address: BADGES, abi: badgesAbi, functionName: "uri", args: [id] });
    if (uri) uris.push(uri);
  }
  if (uris.length < 3) throw new Error("Not enough existing profile metadata to reuse");
  return uris;
});
for (const [i, who] of ["alice", "bob", "carol"].entries()) {
  await step(`profile:${who}`, async () => {
    if ((await pub.readContract({ address: BADGES, abi: badgesAbi, functionName: "profileBadgeId", args: [acct[who].address] })) !== 0n) return "exists";
    await send(who, { address: BADGES, abi: badgesAbi, functionName: "createProfile", args: [metadata[i]] });
  });
}

// 5. The Safe mints role badges to the legacy wallets.
const grants = [["alice", governor], ["bob", governor], ["alice", coreTeam], ["carol", coreTeam]];
for (const [who, id] of grants) {
  await step(`grant:${who}:${id}`, () =>
    safeExec(BADGES, encodeFunctionData({ abi: badgesAbi, functionName: "mint", args: [acct[who].address, BigInt(id), 1n, "0x"] })).then(() => undefined),
  );
}

// 6. Alice manages a community; Bob is a member.
const community = await step("community", async () => {
  const receipt = await send("alice", {
    address: REGISTRY,
    abi: registryAbi,
    functionName: "createCommunity",
    args: ["Rehearsal Guild", "Smart-account migration rehearsal", "", "", ""],
  });
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: registryAbi, ...log });
      if (ev.eventName === "CommunityCreated") return { id: ev.args.communityId.toString(), member: ev.args.memberBadgeId.toString() };
    } catch {}
  }
  throw new Error("No CommunityCreated");
});
await step("community:bob", () =>
  send("alice", { address: BADGES, abi: badgesAbi, functionName: "mint", args: [acct.bob.address, BigInt(community.member), 1n, "0x"] }).then(() => undefined),
);

// 7. Alice invites Carol (EOA to EOA, as the old app did).
await step("invite:alice->carol", async () => {
  if (await pub.readContract({ address: BADGES, abi: badgesAbi, functionName: "hasInvited", args: [acct.alice.address, acct.carol.address] })) return "exists";
  const nonce = 1n;
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400 * 30);
  const signature = await acct.alice.signTypedData({
    domain: { name: "SocietyProtocol", version: "1", chainId: sepolia.id, verifyingContract: BADGES },
    types: { Invite: [{ name: "inviter", type: "address" }, { name: "invitee", type: "address" }, { name: "nonce", type: "uint256" }, { name: "expiry", type: "uint256" }] },
    primaryType: "Invite",
    message: { inviter: acct.alice.address, invitee: acct.carol.address, nonce, expiry },
  });
  await send("carol", { address: BADGES, abi: badgesAbi, functionName: "acceptInvite", args: [acct.alice.address, nonce, expiry, signature] });
});

console.log("\nRehearsal setup on Sepolia:");
console.log(JSON.stringify({ safe, safeOwners: [SAFE_OWNER, acct.funder.address], badges: { dao, governor, coreTeam }, community, legacy: Object.fromEntries(["alice", "bob", "carol"].map((w) => [w, acct[w].address])) }, null, 2));
console.log(`\nNext: node scripts/migrate-to-smart-accounts.mjs --chain sepolia --safe ${safe}`);
