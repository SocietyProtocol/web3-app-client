"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useSnackbar } from "notistack";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { tokens } from "@/consts/tokens";
import { useTransactionWithApproval } from "@/hooks/useTransactionWithApproval";
import { useBalanceOf } from "@/hooks/erc20/useBalanceOf";
import { SocietyVipManagerABI } from "@/abis/SocietyVipManager";
import { capturePostHogEvent } from "@/lib/posthog";

interface UseLockMutationParams {
  amount?: bigint;
  durationInSeconds?: bigint;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  enabled?: boolean;
}

export const useLockMutation = ({
  amount,
  durationInSeconds,
  onSuccess,
  onError,
  enabled = true,
}: UseLockMutationParams) => {
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();

  const contractAddress = useChainVar(contracts.vipManager!);
  const tokenAddress = useChainVar(tokens.spec);

  const specBalance = useBalanceOf({ address, tokenAddress });

  const isEnabled =
    enabled && amount !== undefined && durationInSeconds !== undefined;

  const transaction = useTransactionWithApproval({
    tokenAddress,
    spenderAddress: contractAddress,
    amount,
    address: contractAddress,
    abi: SocietyVipManagerABI,
    functionName: "lock",
    args:
      amount !== undefined && durationInSeconds !== undefined
        ? [amount, durationInSeconds]
        : undefined,
    queryKeysToInvalidateOnSuccess: [specBalance.queryKey],
    onSuccess: (transactionReceipt) => {
      capturePostHogEvent("spec_locked", {
        wallet_address: address?.toLowerCase(),
        amount,
        duration_seconds: durationInSeconds,
        token_address: tokenAddress,
        tx_hash: transactionReceipt.transactionHash,
      });

      onSuccess?.();
    },
    onError,
    enabled: isEnabled,
    autoExecute: true,
  });

  const lock = useCallback(async () => {
    if (
      transaction.isExecuting ||
      transaction.isLoading ||
      transaction.isSyncing
    ) {
      return;
    }

    if (amount === undefined || durationInSeconds === undefined) {
      enqueueSnackbar("Missing required lock parameters", { variant: "error" });
      return;
    }

    await transaction.execute();
  }, [amount, durationInSeconds, transaction, enqueueSnackbar]);

  const isMutating =
    transaction.isApproving || transaction.isExecuting || transaction.isLoading;

  return {
    mutate: lock,
    reset: transaction.reset,
    isTransactionPending: transaction.isLoading,
    isApproving: transaction.isApproving,
    isWritingContract: transaction.isExecuting,
    isTransactionConfirmed: transaction.isSuccess,
    isError: transaction.isError,
    isSyncing: transaction.isSyncing,
    isMutating,
    approveRequired: transaction.approveRequired,
    lockReceipt: transaction.txReceipt,
    approveReceipt: transaction.approveReceipt,
    simulation: transaction.approveRequired
      ? transaction.approvalTransaction.simulation
      : transaction.mainTransaction.simulation,
    gas: transaction.approveRequired
      ? transaction.approvalTransaction.gas
      : transaction.mainTransaction.gas,
    gasLoading: transaction.approveRequired
      ? transaction.approvalTransaction.gasLoading
      : transaction.mainTransaction.gasLoading,
    gasError: transaction.approveRequired
      ? transaction.approvalTransaction.gasError
      : transaction.mainTransaction.gasError,
  };
};
