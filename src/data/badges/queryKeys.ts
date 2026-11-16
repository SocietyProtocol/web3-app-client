import { Address } from "viem";

/**
 * Query-key prefixes that match every wagmi chain read of the badges
 * contract: `useReadContracts` (holder balances, total supplies) and
 * `useReadContract` (single balances). Invalidate them after a transaction
 * that changes badge amounts, so the amounts are read again: the subgraph
 * queries are refetched by their own keys, but these reads keep theirs when
 * the holder list does not change.
 *
 * TanStack matches keys partially, so `contracts: [{ address }]` matches a
 * multicall whose first contract is the badges contract (the badge hooks
 * read that one contract only).
 */
export const badgeContractReadsQueryKeys = (badges: Address) =>
  [
    ["readContracts", { contracts: [{ address: badges }] }],
    ["readContract", { address: badges }],
  ] as const;
