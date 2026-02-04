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
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface ExecuteTransactionParams {
  address: Hex;
  abi: readonly unknown[];
  functionName: string;
  args?: unknown[];
}

export const useTransactionWithApproval = ({
  tokenAddress,
  spenderAddress,
  amount,
  enabled = true,
  onSuccess,
  onError,
}: UseTransactionWithApprovalParams) => {
  const { address } = useAccount();

  const allowance = useAllowance({
    ownerAddress: address,
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
    enabled,
    waitForSync: false,
    onSuccess: () => {
      allowance.refetch();
    },
    onError,
    submittedMessage: "Approval transaction submitted",
    successMessage: "Approval successful",
  });

  const { execute: executeApproval, reset: resetApproval } =
    approvalTransaction;

  // Main transaction
  const transaction = useTransaction({
    enabled,
    onSuccess: () => {
      allowance.refetch();
      onSuccess?.();
    },
    onError,
  });

  const { execute: executeTransaction, reset: resetTransaction } = transaction;

  const approve = useCallback(async () => {
    if (
      !enabled ||
      !tokenAddress ||
      !spenderAddress ||
      !amount ||
      allowance.data === undefined
    ) {
      return;
    }

    await executeApproval({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, amount],
    });
  }, [
    enabled,
    tokenAddress,
    spenderAddress,
    amount,
    allowance.data,
    executeApproval,
  ]);

  const execute = useCallback(
    async (params: ExecuteTransactionParams) => {
      if (!enabled) return;

      // Reset previous state when starting a new transaction
      if (transaction.status === "success" || transaction.status === "error") {
        resetApproval();
        resetTransaction();
      }

      if (approveRequired) {
        await approve();
      } else {
        await executeTransaction(params);
      }
    },
    [
      enabled,
      transaction.status,
      approveRequired,
      resetApproval,
      resetTransaction,
      approve,
      executeTransaction,
    ],
  );

  const reset = useCallback(() => {
    resetApproval();
    resetTransaction();
  }, [resetApproval, resetTransaction]);

  // Handle approval success
  // No longer needed - useTransaction handles everything

  const isLoading = approvalTransaction.isLoading || transaction.isLoading;

  return {
    execute,
    executeTransaction,
    reset,
    status: approvalTransaction.isExecuting
      ? "approving"
      : approvalTransaction.isError
        ? "error"
        : transaction.status,
    isLoading,
    isApproving: approvalTransaction.isExecuting,
    isExecuting: transaction.isExecuting,
    isSuccess: transaction.isSuccess,
    isError: approvalTransaction.isError || transaction.isError,
    isSyncing: transaction.isSyncing,
    approveRequired,
    approveReceipt: approvalTransaction.txReceipt,
    txReceipt: transaction.txReceipt,
  };
};
