"use client";

import { useReadContract } from "wagmi";
import { Address } from "viem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { SocietyVipManagerABI } from "@/abis/SocietyVipManager";

interface UseCurrentLockParams {
  address?: Address;
}

export const useCurrentLock = ({ address }: UseCurrentLockParams) => {
  const contractAddress = useChainVar(contracts.vipManager!);

  const result = useReadContract({
    address: contractAddress,
    abi: SocietyVipManagerABI,
    functionName: "locks",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      staleTime: 5_000,
    },
  });

  const amount = result.data?.[0];
  const unlockTime = result.data?.[1];

  const hasLock =
    amount !== undefined && amount > BigInt(0) && unlockTime !== undefined;
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const isLocked =
    hasLock && unlockTime !== undefined && unlockTime > nowSeconds;
  const canClaim =
    hasLock && unlockTime !== undefined && unlockTime <= nowSeconds;

  return {
    amount,
    unlockTime,
    hasLock,
    isLocked,
    canClaim,
    isLoading: result.isLoading,
    queryKey: result.queryKey,
  };
};
