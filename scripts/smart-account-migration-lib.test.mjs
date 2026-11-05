import { describe, expect, it, vi } from "vitest";
import {
  CHAINS,
  EXPECTED_MAINNET_MIGRATABLE,
  batchFileNames,
  chainConfig,
  chunkMembers,
  isContractCode,
  isStaleBatchFile,
  lightAccountAddress,
  mergeChainMap,
  parseArgs,
  parseIdList,
  planMember,
  rangeLimitFromError,
  rollbackCalls,
  rpcLabel,
  rpcList,
  safeBatch,
  scanLogs,
  selectMigratable,
  splitRange,
} from "./smart-account-migration-lib.mjs";
import { checkMember } from "./verify-smart-account-migration.mjs";

const EOA = "0x1d7Af3d1de21354BBFFE7d22761AeDDCBE71D216";
const BADGES = CHAINS.mainnet.badges;

describe("args and chain config", () => {
  it("parses flags with spaces, equals, and bare switches", () => {
    expect(parseArgs(["--chain", "sepolia", "--split=10", "--dry-run"])).toEqual({
      chain: "sepolia",
      split: "10",
      "dry-run": true,
    });
  });

  it("rejects unknown chains", () => {
    expect(() => chainConfig("goerli")).toThrow(/mainnet, sepolia/);
    expect(chainConfig().chain.id).toBe(1);
    expect(chainConfig("sepolia").chain.id).toBe(11155111);
  });

  it("puts RPC_URL first and never prints its path", () => {
    const list = rpcList(CHAINS.mainnet, "https://eth-mainnet.example/v2/secret");
    expect(list[0]).toBe("https://eth-mainnet.example/v2/secret");
    expect(list).toContain("https://ethereum-rpc.publicnode.com");
    expect(rpcLabel(list[0])).toBe("eth-mainnet.example (RPC_URL)");
    expect(rpcLabel("https://1rpc.io/eth")).toBe("1rpc.io/eth");
  });

  it("parses badge overrides", () => {
    expect(parseIdList("13, 24")).toEqual([13n, 24n]);
    expect(parseIdList(undefined)).toBeUndefined();
    expect(() => parseIdList("13,x")).toThrow();
  });
});

describe("addresses and code", () => {
  it("derives the Light Account the report lists for profile #73", () => {
    expect(lightAccountAddress(EOA)).toBe("0x3DCc9632be6CF6e63FaE7009949A185F4cd38C23");
  });

  it("treats empty and 7702-delegated code as an EOA", () => {
    expect(isContractCode("0x")).toBe(false);
    expect(isContractCode(undefined)).toBe(false);
    expect(isContractCode(`0xef0100${"ab".repeat(20)}`)).toBe(false);
    expect(isContractCode("0x6080604052")).toBe(true);
  });
});

describe("log scan", () => {
  it("reads range caps out of provider errors", () => {
    expect(rangeLimitFromError({ details: "eth_getLogs is limited to 0 - 50 blocks range" })).toBe(50);
    expect(rangeLimitFromError({ details: "ranges over 10000 blocks are not supported on free plan" })).toBe(10000);
    expect(rangeLimitFromError({ details: "range too large. Max range: 800" })).toBe(800);
    expect(rangeLimitFromError({ details: "up to a 10 block range" })).toBe(10);
    expect(rangeLimitFromError({ details: "rate limited" })).toBeUndefined();
  });

  it("splits ranges inclusively", () => {
    expect(splitRange(0n, 24n, 10n)).toEqual([
      [0n, 9n],
      [10n, 19n],
      [20n, 24n],
    ]);
  });

  it("drops endpoints without history, shrinks to caps, and retries", async () => {
    const seen = [];
    const pruned = {
      label: "pruned",
      client: { getLogs: vi.fn(async () => Promise.reject({ details: "Archive requests require a personal token" })) },
    };
    let flaky = 0;
    const capped = {
      label: "capped",
      client: {
        getLogs: vi.fn(async ({ fromBlock, toBlock }) => {
          if (toBlock - fromBlock + 1n > 5000n) {
            return Promise.reject({ details: "ranges over 5000 blocks are not supported" });
          }
          if (flaky++ === 1) return Promise.reject(new Error("socket hang up"));
          seen.push([fromBlock, toBlock]);
          return fromBlock === 0n ? [{ args: { user: EOA, id: 73n } }] : [];
        }),
      },
    };
    const { logs } = await scanLogs({
      endpoints: [pruned, capped],
      address: BADGES,
      event: {},
      fromBlock: 0n,
      toBlock: 19_999n,
      wait: async () => {},
    });
    expect(logs).toHaveLength(1);
    const covered = seen.reduce((sum, [from, to]) => sum + (to - from + 1n), 0n);
    expect(covered).toBe(20_000n);
    expect(seen.every(([from, to]) => to - from + 1n <= 5000n)).toBe(true);
  });

  it("fails loudly when nothing can serve the logs", async () => {
    const dead = {
      label: "dead",
      client: { getLogs: async () => Promise.reject({ details: "pruned history unavailable" }) },
    };
    await expect(
      scanLogs({ endpoints: [dead], address: BADGES, event: {}, fromBlock: 0n, toBlock: 10n }),
    ).rejects.toThrow(/No RPC/);
  });
});

describe("selectMigratable", () => {
  const admin = (id, extra = {}) => ({
    id,
    hook: "0x0000000000000000000000000000000000000000",
    isProfile: false,
    isCommunity: false,
    isOfficial: true,
    minters: [11n, 12n],
    burners: [11n, 12n],
    ...extra,
  });
  // Shaped like mainnet: 11 DAO, 12 Security Council, 13.. roles.
  const badges = [
    admin(11n, { minters: [], burners: [] }),
    admin(12n, { minters: [11n], burners: [11n] }),
    admin(13n),
    admin(14n, { hook: "0x884026884026884026884026884026884026884c", minters: [], burners: [] }),
    admin(17n, { isProfile: true, minters: [], burners: [] }),
    admin(19n, { isCommunity: true, minters: [18n], burners: [18n] }),
    admin(24n),
    admin(50n),
    admin(67n, { minters: [66n], burners: [] }),
  ];

  it("keeps only badges the Safe can mint and burn", () => {
    const { migratable, reasons } = selectMigratable(badges, [11n]);
    expect(migratable).toEqual([13n, 24n, 50n]);
    expect(reasons["11"]).toContain("held by the Safe");
    expect(reasons["12"]).toEqual(["credential for other badges"]);
    expect(reasons["14"]).toContain("has a hook");
    expect(reasons["17"]).toContain("profile");
    expect(reasons["19"]).toContain("community");
    expect(reasons["67"]).toContain("Safe cannot burn");
  });

  it("can include credential badges on request", () => {
    expect(selectMigratable(badges, [11n], { includeCredentials: true }).migratable).toEqual([
      12n,
      13n,
      24n,
      50n,
    ]);
  });

  it("ignores rules of non-official badges, which anyone can create", () => {
    const griefed = [
      ...badges,
      admin(80n, { isOfficial: false, minters: [11n, 13n, 24n], burners: [50n] }),
    ];
    const { migratable, reasons } = selectMigratable(griefed, [11n]);
    expect(migratable).toEqual([13n, 24n, 50n]);
    expect(reasons["13"]).toBeUndefined();
    expect(reasons["80"]).toEqual(["Safe cannot burn"]);
  });

  it("finds nothing for a Safe that holds nothing", () => {
    expect(selectMigratable(badges, []).migratable).toEqual([]);
  });

  it("knows the expected mainnet set", () => {
    expect(EXPECTED_MAINNET_MIGRATABLE.map(String)).toEqual(["13", "24", "25", "26", "27", "28", "50"]);
  });
});

describe("batches", () => {
  const smart = lightAccountAddress(EOA);

  it("plans deploy, mint the missing amount, burn all, and the reverse", () => {
    const { forward, moved } = planMember({
      badges: BADGES,
      eoa: EOA,
      smart,
      smartDeployed: false,
      balances: [
        { id: 13n, onOld: 0n, onSmart: 0n },
        { id: 50n, onOld: 2n, onSmart: 1n },
      ],
    });
    expect(forward.map((tx) => tx.contractMethod.name)).toEqual(["createAccount", "mint", "burn"]);
    expect(forward[1].contractInputsValues).toMatchObject({ to: smart, id: "50", amount: "1" });
    expect(forward[2].contractInputsValues).toMatchObject({ from: EOA, id: "50", value: "2" });
    expect(moved).toEqual([{ id: "50", amount: "2", minted: "1" }]);

    const back = rollbackCalls({ badges: BADGES, eoa: EOA, smart, moved });
    expect(back.map((tx) => [tx.contractMethod.name, tx.contractInputsValues])).toEqual([
      ["mint", { to: EOA, id: "50", amount: "2", data: "0x" }],
      ["burn", { from: smart, id: "50", value: "1" }],
    ]);
  });

  it("skips createAccount when the Light Account exists", () => {
    const { forward } = planMember({ badges: BADGES, eoa: EOA, smart, smartDeployed: true, balances: [] });
    expect(forward).toEqual([]);
  });

  it("writes the Safe and chain into the Transaction Builder file", () => {
    const batch = safeBatch({
      chainId: 11155111,
      safe: "0x000000000000000000000000000000000000dEaD",
      name: "n",
      description: "d",
      transactions: [],
      createdAt: 1,
    });
    expect(batch.chainId).toBe("11155111");
    expect(batch.meta.createdFromSafeAddress).toBe("0x000000000000000000000000000000000000dEaD");
  });

  it("splits members and names files per chain and part", () => {
    expect(chunkMembers([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkMembers([1, 2], 0)).toEqual([[1, 2]]);
    expect(batchFileNames("mainnet", 1)).toEqual({
      forward: ["safe-smart-account-migration.mainnet.json"],
      rollback: ["safe-smart-account-migration.rollback.mainnet.json"],
      report: "smart-account-migration-report.mainnet.json",
    });
    expect(batchFileNames("sepolia", 2).rollback).toEqual([
      "safe-smart-account-migration.rollback.sepolia.part-1-of-2.json",
      "safe-smart-account-migration.rollback.sepolia.part-2-of-2.json",
    ]);
  });

  it("cleans the old un-suffixed files and only this chain's batches", () => {
    expect(isStaleBatchFile("safe-smart-account-migration.json", "mainnet")).toBe(true);
    expect(isStaleBatchFile("smart-account-migration-report.json", "mainnet")).toBe(true);
    expect(isStaleBatchFile("safe-smart-account-migration.mainnet.part-1-of-3.json", "mainnet")).toBe(true);
    expect(isStaleBatchFile("safe-smart-account-migration.rollback.mainnet.json", "mainnet")).toBe(true);
    expect(isStaleBatchFile("safe-smart-account-migration.sepolia.json", "mainnet")).toBe(false);
    expect(isStaleBatchFile("smart-account-migration-report.mainnet.json", "mainnet")).toBe(false);
  });
});

describe("mergeChainMap", () => {
  it("lifts a flat map to mainnet and replaces only the given chain", () => {
    const flat = { "0xabc": "0xS1" };
    expect(mergeChainMap(flat, 11155111, { "0xdef": "0xS2" })).toEqual({
      1: { "0xabc": "0xS1" },
      11155111: { "0xdef": "0xS2" },
    });
    const keyed = { 1: { "0xabc": "0xS1" }, 11155111: { "0xdef": "0xS2" } };
    expect(mergeChainMap(keyed, 1, { "0x123": "0xS3" })).toEqual({
      1: { "0x123": "0xS3" },
      11155111: { "0xdef": "0xS2" },
    });
    expect(Object.keys(mergeChainMap({}, 1, {}))).toEqual(["1", "11155111"]);
  });
});

describe("verify checkMember", () => {
  const member = {
    eoa: EOA,
    smart: lightAccountAddress(EOA),
    moved: [{ id: "50", amount: "2", minted: "2" }],
  };
  const key = (account, id) => `${account.toLowerCase()}:${id}`;

  it("passes when S has code and the badges, E has none", () => {
    const balances = new Map([[key(member.smart, 50n), 2n]]);
    expect(checkMember(member, [13n, 50n], { smartCode: "0x60", balances })).toEqual([]);
  });

  it("reports every mismatch", () => {
    const balances = new Map([
      [key(member.eoa, 50n), 2n],
      [key(member.eoa, 13n), 1n],
    ]);
    expect(checkMember(member, [13n, 50n], { smartCode: "0x", balances })).toEqual([
      "smart account has no code",
      "smart holds 0 of #50, expected 2",
      "old wallet still holds 1 of #13",
      "old wallet still holds 2 of #50",
    ]);
  });
});
