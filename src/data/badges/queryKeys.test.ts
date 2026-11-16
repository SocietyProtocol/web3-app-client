import { QueryClient, type QueryKey } from "@tanstack/react-query";
import {
  hashFn,
  readContractQueryKey,
  readContractsQueryKey,
} from "@wagmi/core/query";
import { describe, expect, it } from "vitest";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { badgeContractReadsQueryKeys } from "./queryKeys";

const BADGES = "0x1111111111111111111111111111111111111111" as const;
const OTHER = "0x2222222222222222222222222222222222222222" as const;
const HOLDER = "0x3333333333333333333333333333333333333333" as const;
const CHAIN_ID = 1;

// The keys wagmi gives the reads of useBadgeQuantities and useBadgeBalanceOf.
const totalSupplies = readContractsQueryKey({
  contracts: [
    {
      address: BADGES,
      abi: SocietyProtocolBadgesABI,
      functionName: "totalSupply",
      args: [BigInt(7)],
      chainId: CHAIN_ID,
    },
  ],
});
const holderBalances = readContractsQueryKey({
  contracts: [
    {
      address: BADGES,
      abi: SocietyProtocolBadgesABI,
      functionName: "balanceOf",
      args: [HOLDER, BigInt(7)],
      chainId: CHAIN_ID,
    },
  ],
});
const singleBalance = readContractQueryKey({
  address: BADGES,
  abi: SocietyProtocolBadgesABI,
  functionName: "balanceOf",
  args: [HOLDER, BigInt(7)],
  chainId: CHAIN_ID,
});
const otherContract = readContractsQueryKey({
  contracts: [
    {
      address: OTHER,
      abi: SocietyProtocolBadgesABI,
      functionName: "totalSupply",
      args: [BigInt(7)],
      chainId: CHAIN_ID,
    },
  ],
});
const subgraph: QueryKey = ["badges"];

describe("badgeContractReadsQueryKeys", () => {
  it("invalidates the badges contract's chain reads, and nothing else", async () => {
    // wagmi hashes its keys (which hold bigints) with its own hashFn.
    const client = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: hashFn } },
    });
    const keys = [
      totalSupplies,
      holderBalances,
      singleBalance,
      otherContract,
      subgraph,
    ] as QueryKey[];
    for (const key of keys) client.setQueryData(key, "cached");

    await Promise.all(
      badgeContractReadsQueryKeys(BADGES).map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );

    const invalidated = (key: QueryKey) =>
      client.getQueryState(key)?.isInvalidated;
    expect(invalidated(totalSupplies as QueryKey)).toBe(true);
    expect(invalidated(holderBalances as QueryKey)).toBe(true);
    expect(invalidated(singleBalance as QueryKey)).toBe(true);
    expect(invalidated(otherContract as QueryKey)).toBe(false);
    expect(invalidated(subgraph)).toBe(false);
  });
});
