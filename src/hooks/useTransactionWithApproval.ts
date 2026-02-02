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

  // Main transaction
  const transaction = useTransaction({
    enabled,
    onSuccess: () => {
      allowance.refetch();
      onSuccess?.();
    },
    onError,
  });

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

    await approvalTransaction.execute({
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
    approvalTransaction,
  ]);

  const execute = useCallback(
    async (params: ExecuteTransactionParams) => {
      if (!enabled) return;

      // Reset previous state when starting a new transaction
      if (transaction.status === "success" || transaction.status === "error") {
        approvalTransaction.reset();
        transaction.reset();
      }

      if (approveRequired) {
        await approve();
      } else {
        await transaction.execute(params);
      }
    },
    [enabled, transaction, approvalTransaction, approveRequired, approve],
  );

  const reset = useCallback(() => {
    approvalTransaction.reset();
    transaction.reset();
  }, [approvalTransaction, transaction]);

  // Handle approval success
  // No longer needed - useTransaction handles everything

  const isLoading = approvalTransaction.isLoading || transaction.isLoading;

  return {
    execute,
    executeTransaction: transaction.execute,
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
