"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Hex, TransactionReceipt } from "viem";
import { useSnackbar } from "notistack";
import { useWaitForSubgraphSync } from "@/hooks/useWaitForSubgraphSync";
import { useEstimateGas } from "@/hooks/useEstimateGas";
import { parseErrorMessage } from "@/utils/errors";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { IconButton, Link, Tooltip } from "@mui/material";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useStableArray } from "./useStableArray";

type TransactionStatus = "idle" | "executing" | "success" | "error";

interface UseTransactionParams {
  // Transaction parameters (for upfront configuration)
  address?: Hex;
  abi?: readonly unknown[];
  functionName?: string;
  args?: unknown[];
  value?: bigint;

  // Simulation options
  simulate?: boolean;

  // Execution options
  enabled?: boolean;
  waitForSync?: boolean;

  queryKeysToInvalidateOnSuccess?: QueryKey[]; // Array of query keys to invalidate on success

  // Callbacks
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;

  // Messages
  pendingMessage?: string;
  submittedMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  suppressErrorSnackbar?: boolean;
  snackbarKeyPrefix?: string;
}

export interface ExecuteTransactionParams {
  address: Hex;
  abi: readonly unknown[];
  functionName: string;
  args?: unknown[];
  value?: bigint;
}

const TransactionNotificationActions = ({
  txHash,
  id,
}: {
  txHash: Hex;
  id?: string;
}) => {
  const { closeSnackbar } = useSnackbar();

  const buildExplorerLink = useExplorerLinkBuilder();
  const explorerLink = useMemo(
    () => buildExplorerLink({ tx: txHash }),
    [buildExplorerLink, txHash],
  );

  return (
    <>
      <Tooltip title="View on Block Explorer">
        <IconButton
          size="small"
          component={Link}
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            p: 0.5,
            color: "text.primary",
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      {id && (
        <Tooltip title="Close Notification">
          <IconButton
            size="small"
            sx={{
              p: 0.5,
              color: "text.primary",
            }}
            onClick={() => closeSnackbar(id)}
          >
            <CloseOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
};

export const useTransaction = ({
  // Transaction parameters
  address,
  abi,
  functionName,
  args,
  value,

  // Options
  simulate = true,
  enabled = true,
  waitForSync = true,

  queryKeysToInvalidateOnSuccess = [],

  // Callbacks
  onSuccess,
  onError,

  // Messages
  pendingMessage = "Please confirm the transaction in your wallet",
  submittedMessage = "Transaction submitted",
  successMessage = "Transaction successful!",
  errorMessage = "Transaction failed",
  suppressErrorSnackbar = false,
  snackbarKeyPrefix,
}: UseTransactionParams = {}) => {
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [txHash, setTxHash] = useState<Hex>();
  const handledTxHashRef = useRef<Hex | undefined>(undefined);

  const invalidateOnSuccessStable = useStableArray(
    queryKeysToInvalidateOnSuccess,
  );

  const uniqueId = useId();

  const snackbarKeyPrefixFinal = snackbarKeyPrefix ?? `transaction-${uniqueId}`;

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const queryClient = useQueryClient();

  const { writeContractAsync, isPending } = useWriteContract();

  // Simulate the transaction
  const simulation = useSimulateContract(
    simulate && address && abi && functionName && args && enabled
      ? ({
          address,
          abi,
          functionName,
          args,

          ...(value !== undefined && { value }),

          query: {
            retry: false, // Don't retry simulation on failure
          },
        } as Parameters<typeof useSimulateContract>[0])
      : undefined,
  );

  const txReceipt = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { isSynced, isWaiting } = useWaitForSubgraphSync(
    txReceipt.data?.blockNumber,
  );

  // Estimate gas for the transaction
  const gasEstimation = useEstimateGas({
    address,
    abi,
    functionName,
    args,
    value,
    enabled: enabled && simulate,
  });

  const execute = useCallback(
    async (params?: ExecuteTransactionParams) => {
      const finalAddress = params?.address ?? address;
      const finalAbi = params?.abi ?? abi;
      const finalFunctionName = params?.functionName ?? functionName;
      const finalArgs = params?.args ?? args;
      const finalValue = params?.value ?? value;

      if (!enabled || !finalAddress || !finalAbi || !finalFunctionName) return;

      // Reset previous transaction state when starting a new transaction
      if (status === "success" || status === "error") {
        setTxHash(undefined);
        setStatus("idle");
      }

      try {
        setStatus("executing");
        closeSnackbar(`${snackbarKeyPrefixFinal}-error`);
        enqueueSnackbar(pendingMessage, {
          key: `${snackbarKeyPrefixFinal}-pending`,
          variant: "info",
        });

        const hash = await writeContractAsync({
          address: finalAddress,
          abi: finalAbi,
          functionName: finalFunctionName,
          args: finalArgs,
          ...(finalValue !== undefined && { value: finalValue }),
        } as Parameters<typeof writeContractAsync>[0]);

        setTxHash(hash);
        closeSnackbar(`${snackbarKeyPrefixFinal}-pending`);
        enqueueSnackbar(submittedMessage, {
          variant: "info",
          key: `${snackbarKeyPrefixFinal}-submitted`,
          action: (
            <TransactionNotificationActions
              txHash={hash}
              id={`${snackbarKeyPrefixFinal}-submitted`}
            />
          ),
        });
      } catch (error) {
        setStatus("error");
        closeSnackbar(`${snackbarKeyPrefixFinal}-pending`);
        if (!suppressErrorSnackbar) {
          enqueueSnackbar(parseErrorMessage(error, errorMessage), {
            variant: "error",
            key: `${snackbarKeyPrefixFinal}-error`,
          });
        }
        onError?.(error);
      }
    },
    [
      address,
      abi,
      functionName,
      args,
      value,
      enabled,
      status,
      closeSnackbar,
      snackbarKeyPrefixFinal,
      enqueueSnackbar,
      pendingMessage,
      writeContractAsync,
      submittedMessage,
      suppressErrorSnackbar,
      onError,
      errorMessage,
    ],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(undefined);
  }, []);

  // Handle transaction success/error
  useEffect(() => {
    if (status === "executing" && txReceipt.isFetched) {
      const shouldWait = waitForSync ? isSynced : true;

      if (txReceipt.status === "error") {
        if (handledTxHashRef.current === txHash) return;
        handledTxHashRef.current = txHash;
        queueMicrotask(async () => {
          setStatus("error");
          if (!suppressErrorSnackbar) {
            enqueueSnackbar(parseErrorMessage(txReceipt.error, errorMessage), {
              variant: "error",
              key: `${snackbarKeyPrefixFinal}-error`,
            });
          }
          onError?.(txReceipt.error);
        });
      } else if (txReceipt.status === "success" && shouldWait) {
        if (handledTxHashRef.current === txHash) return;
        handledTxHashRef.current = txHash;
        queueMicrotask(async () => {
          try {
            await Promise.all(
              invalidateOnSuccessStable.map((queryKey) =>
                queryClient.invalidateQueries({ queryKey }),
              ),
            );
          } catch (error) {
            console.error("Error invalidating queries:", error);
          }

          setStatus("success");
          enqueueSnackbar(successMessage, {
            key: `${snackbarKeyPrefixFinal}-success`,
            variant: "success",
            action: txHash ? (
              <TransactionNotificationActions
                txHash={txHash}
                id={`${snackbarKeyPrefixFinal}-success`}
              />
            ) : undefined,
          });

          onSuccess?.(txReceipt.data);
        });
      }
    }
  }, [
    status,
    txReceipt.isFetched,
    txReceipt.status,
    txReceipt.error,
    txReceipt.data,
    isSynced,
    waitForSync,
    enqueueSnackbar,
    successMessage,
    txHash,
    suppressErrorSnackbar,
    snackbarKeyPrefixFinal,
    errorMessage,
    queryClient,
    onError,
    invalidateOnSuccessStable,
    onSuccess,
  ]);

  useEffect(() => {
    if (simulation.isError) {
      console.error("Transaction simulation error:", simulation.error);
    }
  }, [simulation.isError, simulation.error]);

  return {
    execute,
    reset,
    status,
    isLoading:
      status === "executing" || isPending || (waitForSync && isWaiting),
    isSigning: status === "executing" && !txHash,
    isConfirming: status === "executing" && txHash && txReceipt.isLoading,
    isExecuting: status === "executing",
    isSuccess: status === "success",
    isError: status === "error",
    isSyncing: status === "executing" && waitForSync && isWaiting,

    // Simulation state
    simulation: {
      isError: simulation.isError,
      error: simulation.error,
      isFetching: simulation.isFetching,
      isLoading: simulation.isLoading,
      isSuccess: simulation.isSuccess,
    },

    // Gas estimation
    gas: gasEstimation.totalUsd,
    gasLoading: gasEstimation.isLoading,
    gasError: gasEstimation.isError,
    txReceipt,
    txHash,
  };
};
