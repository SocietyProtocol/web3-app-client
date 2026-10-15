/**
 * Build the DAO Safe batch that deploys each member's Light Account and
 * moves the badges the DAO is allowed to mint. Does not broadcast.
 *
 *   node scripts/migrate-to-smart-accounts.mjs
 *   RPC_URL=https://... node scripts/migrate-to-smart-accounts.mjs
 *
 * The DAO (societyprotocol.eth) holds badge 11 and is a Safe. Import
 * the written JSON in the Safe Transaction Builder. Do not run this
 * from a personal key.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  http,
  keccak256,
  pad,
  parseAbiItem,
  toBytes,
  toHex,
} from "viem";
import { mainnet } from "viem/chains";

const IMPLEMENTATION = "0x8E8e658E22B12ada97B402fF0b044D6A325013C7";

function lightAccountInitCode() {
  const mem = new Uint8Array(0x80);
  const writeWord = (offset, word) => {
    mem.set(toBytes(pad(word, { size: 32 })), offset);
  };
  writeWord(0x60, "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3");
  writeWord(0x40, "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076");
  writeWord(0x20, "0x6009");
  mem.set(toBytes(pad(IMPLEMENTATION, { size: 32 })), 0x1e);
  writeWord(0x0a, "0x603d3d8160223d3973");
  return toHex(mem.slice(0x21, 0x21 + 0x5f));
}

function lightAccountAddress(owner) {
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

const here = dirname(fileURLToPath(import.meta.url));
const badges = getAddress("0x2313C0cDdc233c92d16c2cfE17DF5fDCcE556763");
const factory = getAddress("0x0000000000400CdFef5E2714E63d8040b700BC24");
const fromBlock = 25099621n;
const migratable = [13n, 24n, 25n, 26n, 27n, 28n, 50n];

const badgesAbi = [
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
];

const factoryAbi = [
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

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL || "https://ethereum-rpc.publicnode.com"),
});

const scannedProfiles = [
  ["0x9ba704115F0ed3a431A025ffa0525fDD1D507C3c", 17n],
  ["0x51Bd128Eb1F801cE41910001589D41D452Bd6eEb", 23n],
  ["0x2e468914660439F879721cAffAd710Acdc0A676B", 29n],
  ["0xE776cB56Bf554c2D684Bf39726C9ACce164114A4", 30n],
  ["0xaAE9d45cD6c0b487824a0332d804591B0d438C9B", 34n],
  ["0x09676Ee4685B618d0DCc85E221019c9Ce3810211", 36n],
  ["0x19310357eEb9b5AF955BBd8fF639E65172E2995b", 37n],
  ["0x261ADDe627f7A60BEa2989b6b12Bd7186C0B96fd", 38n],
  ["0x0493c946AEBD49710a5a069c8611727dd890125A", 39n],
  ["0x5B50e75b56B28A7b8BaE81dA251b0Ccfa72d0FAb", 40n],
  ["0xaD50aD547F27e4BB1553Cda8057Fd9680E31C226", 41n],
  ["0x4f93ce49015fa9F57e40fEcaBD01c2ba68D3da0A", 42n],
  ["0x4F14f35245981e47ca00F49066BeAc9C37Babe1e", 43n],
  ["0x283A96231238805D9Cfbe175DD7348f1a37a1b72", 44n],
  ["0x3B15221d93c5A1dDEf43Cb9fA5b2C1311b22848c", 45n],
  ["0x818ab48846d5FE6908b02db1438568E2f20fF5e9", 46n],
  ["0x25d5C9DbC1E12163B973261A08739927E4F72BA8", 47n],
  ["0xa651c309aedEcd6e6347c9eF390afd18986f25AD", 48n],
  ["0x067b91aeAc320Df3d886E6817B00f1f0eefcaf31", 49n],
  ["0xcf08A5aA2066Bff5aA7cCD7D7b7a47fB16Fd17CD", 51n],
  ["0xE317A0b5769b49A157219a76733a48937bC2A5e5", 52n],
  ["0xa90Aa49a215BfF94c1F6b28b6dCFA49d5a907A2f", 53n],
  ["0x3dD929862bd3E3b2649d9a0c9eD36514d0Ad6ecc", 54n],
  ["0x1cc5e66F0d75beADd6DD3cEFeeE87371aE29971f", 55n],
  ["0xF0FAc756d276225dd7aF4133E261528dF2479977", 56n],
  ["0x096D93cdBf4d873e4bfAbfD9354c4771ef4A1187", 57n],
  ["0xA3DB316D9198d888Ec015e02B9b7578b96bb2C0E", 58n],
  ["0xD02Ec09AdA0C4f3176fC9a90569a9232Dcb4afa7", 59n],
  ["0xE8E94Fc399623cc8E96eE3700f5Eb56F903E39a2", 60n],
  ["0xc6eC9DD8b5add6E402A7AF23EA03AB505980eaC2", 64n],
  ["0x6fD7F750e47CB95b7caAAc219a73379a316e764D", 65n],
  ["0x84c11998bc94072265CBe837c1D4890237F98E46", 66n],
];

function safeCall(to, abi, functionName, args, values) {
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

const sample = getAddress("0x0000000000000000000000000000000000000001");
const onChain = await client.readContract({
  address: factory,
  abi: factoryAbi,
  functionName: "getAddress",
  args: [sample, 0n],
});
if (getAddress(onChain) !== lightAccountAddress(sample)) {
  throw new Error("Local Light Account address does not match the factory");
}

let profiles = scannedProfiles.map(([user, id]) => ({ user, id }));
try {
  const logs = await client.getLogs({
    address: badges,
    event: parseAbiItem(
      "event ProfileCreated(address indexed user, uint256 indexed id)",
    ),
    fromBlock,
    toBlock: "latest",
  });
  profiles = logs.map((log) => ({ user: log.args.user, id: log.args.id }));
} catch (error) {
  console.log(`Using the scanned profile list (${profiles.length}). Live log scan failed.`);
}

const members = [];
const transactions = [];
const legacyMap = {};
const rows = profiles.map((profile) => {
  const eoa = getAddress(profile.user);
  const smart = lightAccountAddress(eoa);
  return { eoa, smart, profileId: profile.id };
});

const balanceCalls = rows.flatMap((row) =>
  migratable.flatMap((id) => [
    {
      address: badges,
      abi: badgesAbi,
      functionName: "balanceOf",
      args: [row.eoa, id],
    },
    {
      address: badges,
      abi: badgesAbi,
      functionName: "balanceOf",
      args: [row.smart, id],
    },
  ]),
);
const balances = [];
for (let index = 0; index < balanceCalls.length; index += 40) {
  const chunk = await client.multicall({
    contracts: balanceCalls.slice(index, index + 40),
    allowFailure: false,
  });
  balances.push(...chunk);
}
let cursor = 0;

for (const row of rows) {
  legacyMap[row.eoa.toLowerCase()] = row.smart;
  transactions.push(
    safeCall(factory, factoryAbi, "createAccount", [row.eoa, 0n], {
      owner: row.eoa,
      salt: "0",
    }),
  );

  const moved = [];
  for (const id of migratable) {
    const onOld = balances[cursor++];
    const onSmart = balances[cursor++];
    if (onOld === 0n) continue;
    const missing = onOld > onSmart ? onOld - onSmart : 0n;
    if (missing > 0n) {
      transactions.push(
        safeCall(badges, badgesAbi, "mint", [row.smart, id, missing, "0x"], {
          to: row.smart,
          id: id.toString(),
          amount: missing.toString(),
          data: "0x",
        }),
      );
    }
    transactions.push(
      safeCall(badges, badgesAbi, "burn", [row.eoa, id, onOld], {
        from: row.eoa,
        id: id.toString(),
        value: onOld.toString(),
      }),
    );
    moved.push({
      id: id.toString(),
      amount: onOld.toString(),
      minted: missing.toString(),
    });
  }

  members.push({
    eoa: row.eoa,
    smart: row.smart,
    profileId: row.profileId.toString(),
    moved,
  });
}

const batch = {
  version: "1.0",
  chainId: "1",
  createdAt: Date.now(),
  meta: {
    name: "Outpost smart account migration",
    description:
      "Deploy each member Light Account, mint DAO-movable badges onto it, and burn those badges from the old wallet. Profiles, VIP, SPEC, and community badges are not included.",
    txBuilderVersion: "1.16.5",
  },
  transactions,
};

const report = {
  dao: "societyprotocol.eth",
  badges,
  memberCount: members.length,
  transactionCount: transactions.length,
  notMoved: [
    "Profile badges cannot be burned or transferred.",
    "VIP badges 14, 15, and 16 follow the SPEC lock.",
    "SPEC, VIP locks, and ETH stay on the old wallet.",
    "Community badges are minted by the community manager, not the DAO.",
    "Badges 11 and 12 stay on the DAO and the Security Council.",
  ],
  members,
};

const paths = {
  map: resolve(here, "../src/consts/legacy-account-map.json"),
  forum: resolve(here, "../../discourse-siwe-auth/script/forum-address-map.json"),
  batch: resolve(here, "../../web3-app-contracts/script-output/safe-smart-account-migration.json"),
  report: resolve(here, "../../web3-app-contracts/script-output/smart-account-migration-report.json"),
};

for (const path of Object.values(paths)) mkdirSync(dirname(path), { recursive: true });
writeFileSync(paths.map, `${JSON.stringify(legacyMap, null, 2)}\n`);
writeFileSync(paths.forum, `${JSON.stringify(legacyMap, null, 2)}\n`);
writeFileSync(paths.batch, `${JSON.stringify(batch, null, 2)}\n`);
writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`);

console.log(`members ${members.length}`);
console.log(`safe transactions ${transactions.length}`);
console.log(paths.batch);
