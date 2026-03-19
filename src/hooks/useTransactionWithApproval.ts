"use client";

import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { erc20Abi, Hex, TransactionReceipt } from "viem";
import { useAllowance } from "@/hooks/erc20/useAllowance";
import { useTransaction } from "@/hooks/useTransaction";
import { QueryKey } from "@tanstack/react-query";

interface UseTransactionWithApprovalParams {
  tokenAddress?: Hex;
  spenderAddress?: Hex;
  amount?: bigint;
  address?: Hex;
  abi?: readonly unknown[];
  functionName?: string;
  args?: unknown[];
  enabled?: boolean;
  queryKeysToInvalidateOnSuccess?: QueryKey[];
  onSuccess?: ((transactionReceipt: TransactionReceipt) => void) | undefined;
  onError?: (error: unknown) => void;
  autoExecute?: boolean;
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
  queryKeysToInvalidateOnSuccess = [],
  onSuccess,
  onError,
  autoExecute = false,
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

  // Main transaction
  const mainTransaction = useTransaction({
    address,
    abi,
    functionName,
    args,
    enabled,
    // Only simulate when allowance is known and sufficient — avoids false
    // ERC20InsufficientAllowance errors while approval is pending or loading.
    simulate: enabled && allowance.data !== undefined && !approveRequired,
    queryKeysToInvalidateOnSuccess: [
      ...queryKeysToInvalidateOnSuccess,
      allowance.queryKey,
    ],
    onSuccess,
    onError,
  });

  const { execute: executeTransaction, reset: resetTransaction } =
    mainTransaction;

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
    queryKeysToInvalidateOnSuccess: [allowance.queryKey],
    onSuccess: async () => {
      if (autoExecute) {
        await executeTransaction();
      }
    },
    onError,
    submittedMessage: "Approval transaction submitted",
    successMessage: "Approval successful",
    simulate: true,
  });

  const { execute: approve, reset: resetApproval } = approvalTransaction;

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

    if (allowance.data === undefined) {
      return;
    }

    if (approveRequired) {
      await approve();
    } else {
      await executeTransaction();
    }
  }, [
    enabled,
    mainTransaction.status,
    allowance.data,
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
