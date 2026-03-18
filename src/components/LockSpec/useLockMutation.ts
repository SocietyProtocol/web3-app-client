"use client";

import { useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useSnackbar } from "notistack";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { tokens } from "@/consts/tokens";
import { useTransactionWithApproval } from "@/hooks/useTransactionWithApproval";
import { useBalanceOf } from "@/hooks/erc20/useBalanceOf";
import { SocietyVipManagerABI } from "@/abis/SocietyVipManager";

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
    onSuccess,
    onError,
    enabled: isEnabled,
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

  // Auto-execute main transaction after approval
  useEffect(() => {
    if (
      transaction.status === "approving" &&
      transaction.approveReceipt?.status === "success" &&
      amount !== undefined &&
      durationInSeconds !== undefined
    ) {
      enqueueSnackbar("Approval confirmed, locking SPEC...", {
        variant: "success",
      });
      lock();
    }
  }, [transaction, amount, durationInSeconds, enqueueSnackbar, lock]);

  return {
    mutate: lock,
    reset: transaction.reset,
    isLoading: transaction.isLoading,
    isApproving: transaction.isApproving,
    isMutating: transaction.isExecuting,
    isSuccess: transaction.isSuccess,
    isError: transaction.isError,
    isSyncing: transaction.isSyncing,
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
