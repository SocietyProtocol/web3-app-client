"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { tokens } from "@/consts/tokens";
import { useTransaction } from "@/hooks/useTransaction";
import { useBalanceOf } from "@/hooks/erc20/useBalanceOf";
import { SocietyVipManagerABI } from "@/abis/SocietyVipManager";
import { useCurrentLock } from "./useCurrentLock";
import { capturePostHogEvent } from "@/lib/posthog";

interface UseClaimMutationParams {
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const useClaimMutation = ({
  enabled = true,
  onSuccess,
  onError,
}: UseClaimMutationParams = {}) => {
  const { address } = useAccount();
  const contractAddress = useChainVar(contracts.vipManager!);
  const tokenAddress = useChainVar(tokens.spec);

  const specBalance = useBalanceOf({ address, tokenAddress });
  const currentLock = useCurrentLock({ address });

  const isEnabled = enabled && currentLock.canClaim;

  const transaction = useTransaction({
    address: contractAddress,
    abi: SocietyVipManagerABI,
    functionName: "unlock",
    args: [],
    enabled: isEnabled,
    simulate: isEnabled,
    queryKeysToInvalidateOnSuccess: [
      specBalance.queryKey,
      currentLock.queryKey,
    ],
    onSuccess: (receipt) => {
      capturePostHogEvent("spec_claimed", {
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
        locked_amount: currentLock.amount?.toString(),
        unlock_time: currentLock.unlockTime?.toString(),
      });
      onSuccess?.();
    },
    onError,
  });

  const claim = useCallback(async () => {
    if (transaction.isLoading || transaction.isSyncing) return;
    await transaction.execute();
  }, [transaction]);

  return {
    mutate: claim,
    reset: transaction.reset,
    isLoading: transaction.isLoading,
    isMutating: transaction.isExecuting,
    isSuccess: transaction.isSuccess,
    isError: transaction.isError,
    isSyncing: transaction.isSyncing,
    simulation: transaction.simulation,
    gas: transaction.gas,
    gasLoading: transaction.gasLoading,
    gasError: transaction.gasError,
  };
};
