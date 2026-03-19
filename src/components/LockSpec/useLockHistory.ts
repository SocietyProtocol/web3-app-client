"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { Address, parseAbiItem } from "viem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

export interface LockHistoryItem {
  id: string;
  txHash: `0x${string}`;
  amount: bigint;
  lockTimestamp: bigint;
  unlockTime: bigint;
  claimed: boolean;
}

export const useLockHistory = (address?: Address) => {
  const contractAddress = useChainVar(contracts.vipManager!);
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["lockHistory", address?.toLowerCase(), contractAddress],
    queryFn: async (): Promise<LockHistoryItem[]> => {
      if (!address || !publicClient || !contractAddress) return [];

      const [lockedLogs, unlockedLogs] = await Promise.all([
        publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem(
            "event TokensLocked(address indexed user, uint256 amount, uint256 unlockTime)",
          ),
          args: { user: address },
          fromBlock: 0n,
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem(
            "event TokensUnlocked(address indexed user, uint256 amount)",
          ),
          args: { user: address },
          fromBlock: 0n,
          toBlock: "latest",
        }),
      ]);

      // Fetch block timestamps for each unique block in locked events
      const uniqueBlockNumbers = [
        ...new Set(lockedLogs.map((l) => l.blockNumber)),
      ];
      const blocks = await Promise.all(
        uniqueBlockNumbers.map((bn) =>
          publicClient.getBlock({ blockNumber: bn }),
        ),
      );
      const blockTimestamps = new Map(blocks.map((b) => [b.number, b.timestamp]));

      // Walk the timeline (sorted by block) to match each lock with its unlock
      const allEvents = [
        ...lockedLogs.map((l) => ({ ...l, eventType: "locked" as const })),
        ...unlockedLogs.map((l) => ({ ...l, eventType: "unlocked" as const })),
      ].sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

      const result: LockHistoryItem[] = [];
      let pendingLock: (typeof lockedLogs)[0] | null = null;

      for (const event of allEvents) {
        if (event.eventType === "locked") {
          if (pendingLock) {
            // A new lock started before the previous was unlocked
            result.push({
              id: pendingLock.transactionHash,
              txHash: pendingLock.transactionHash,
              amount: pendingLock.args.amount!,
              lockTimestamp:
                blockTimestamps.get(pendingLock.blockNumber) ?? 0n,
              unlockTime: pendingLock.args.unlockTime!,
              claimed: false,
            });
          }
          pendingLock = event as (typeof lockedLogs)[0];
        } else if (pendingLock) {
          result.push({
            id: pendingLock.transactionHash,
            txHash: pendingLock.transactionHash,
            amount: pendingLock.args.amount!,
            lockTimestamp: blockTimestamps.get(pendingLock.blockNumber) ?? 0n,
            unlockTime: pendingLock.args.unlockTime!,
            claimed: true,
          });
          pendingLock = null;
        }
      }

      if (pendingLock) {
        result.push({
          id: pendingLock.transactionHash,
          txHash: pendingLock.transactionHash,
          amount: pendingLock.args.amount!,
          lockTimestamp: blockTimestamps.get(pendingLock.blockNumber) ?? 0n,
          unlockTime: pendingLock.args.unlockTime!,
          claimed: false,
        });
      }

      // Newest first
      return result.reverse();
    },
    enabled: !!address && !!contractAddress,
    staleTime: 30_000,
  });
};
