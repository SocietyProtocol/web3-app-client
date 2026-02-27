"use client";

import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { erc20Abi, Hex } from "viem";
import { useAllowance } from "@/hooks/erc20/useAllowance";
import { useTransaction } from "@/hooks/useTransaction";

interface UseTransactionWithApprovalParams {
  tokenAddress?: Hex;
  spenderAddress?: Hex;
  amount?: bigint;
  address?: Hex;
  abi?: readonly unknown[];
  functionName?: string;
  args?: unknown[];
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const useTransactionWithApproval = ({
  tokenAddress,
  spenderAddress,
  amount,
  address,
  abi,
  functionName,
  args,
  enabled = true,
  onSuccess,
  onError,
}: UseTransactionWithApprovalParams) => {
  const { address: account } = useAccount();

  const allowance = useAllowance({
    ownerAddress: account,
    spenderAddress,
    tokenAddress,
  });

  const approveRequired = useMemo(() => {
    if (!enabled || amount === undefined || allowance.data === undefined) {
      return false;
    }
    return allowance.data < amount;
  }, [enabled, amount, allowance.data]);

  // Approval transaction
  const approvalTransaction = useTransaction({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args:
      spenderAddress && amount !== undefined
        ? [spenderAddress, amount]
        : undefined,
    enabled,
    waitForSync: false,
    onSuccess: () => {
      allowance.refetch();
    },
    onError,
    submittedMessage: "Approval transaction submitted",
    successMessage: "Approval successful",
    simulate: true,
  });

  const { execute: approve, reset: resetApproval } = approvalTransaction;

  // Main transaction
  const mainTransaction = useTransaction({
    address,
    abi,
    functionName,
    args,
    enabled,
    onSuccess: () => {
      allowance.refetch();
      onSuccess?.();
    },
    onError,
  });

  const { execute: executeTransaction, reset: resetTransaction } =
    mainTransaction;

  const execute = useCallback(async () => {
    if (!enabled) return;

    // Reset previous state when starting a new transaction
    if (
      mainTransaction.status === "success" ||
      mainTransaction.status === "error"
    ) {
      resetApproval();
      resetTransaction();
    }

    if (approveRequired) {
      await approve();
    } else {
      await executeTransaction();
    }
  }, [
    enabled,
    mainTransaction.status,
    approveRequired,
    resetApproval,
    resetTransaction,
    approve,
    executeTransaction,
  ]);

  const reset = useCallback(() => {
    resetApproval();
    resetTransaction();
  }, [resetApproval, resetTransaction]);

  // Handle approval success
  // No longer needed - useTransaction handles everything

  const isLoading = approvalTransaction.isLoading || mainTransaction.isLoading;

  return {
    execute,
    executeTransaction,
    reset,
    status: approvalTransaction.isExecuting
      ? "approving"
      : approvalTransaction.isError
        ? "error"
        : mainTransaction.status,
    isLoading,
    isApproving: approvalTransaction.isExecuting,
    isExecuting: mainTransaction.isExecuting,
    isSuccess: mainTransaction.isSuccess,
    isError: approvalTransaction.isError || mainTransaction.isError,
    isSyncing: mainTransaction.isSyncing,
    approveRequired,
    approveReceipt: approvalTransaction.txReceipt,
    txReceipt: mainTransaction.txReceipt,
    approvalTransaction,
    mainTransaction,
  };
};
