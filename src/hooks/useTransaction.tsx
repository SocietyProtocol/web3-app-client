"use client";

import { useCallback, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Hex } from "viem";
import { useSnackbar } from "notistack";
import { useWaitForSubgraphSync } from "@/hooks/useWaitForSubgraphSync";
import { parseErrorMessage } from "@/utils/errors";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton, Link, Tooltip } from "@mui/material";

type TransactionStatus = "idle" | "executing" | "success" | "error";

interface UseTransactionParams {
  enabled?: boolean;
  waitForSync?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  pendingMessage?: string;
  submittedMessage?: string;
  successMessage?: string;
}

interface ExecuteTransactionParams {
  address: Hex;
  abi: readonly unknown[];
  functionName: string;
  args?: unknown[];
}

export const useTransaction = ({
  enabled = true,
  waitForSync = true,
  onSuccess,
  onError,
  pendingMessage = "Please confirm the transaction in your wallet",
  submittedMessage = "Transaction submitted",
  successMessage = "Transaction successful!",
}: UseTransactionParams = {}) => {
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [txHash, setTxHash] = useState<Hex>();

  const { enqueueSnackbar } = useSnackbar();
  const { writeContractAsync, isPending } = useWriteContract();
  const buildExplorerLink = useExplorerLinkBuilder();

  const txReceipt = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { isSynced, isWaiting } = useWaitForSubgraphSync(
    txReceipt.data?.blockNumber,
  );

  const execute = useCallback(
    async (params: ExecuteTransactionParams) => {
      if (!enabled) return;

      // Reset previous transaction state when starting a new transaction
      if (status === "success" || status === "error") {
        setTxHash(undefined);
        setStatus("idle");
      }

      try {
        setStatus("executing");
        enqueueSnackbar(pendingMessage, {
          variant: "info",
        });

        const hash = await writeContractAsync({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
        });

        setTxHash(hash);
        enqueueSnackbar(submittedMessage, { variant: "info" });
      } catch (error) {
        setStatus("error");
        enqueueSnackbar(
          parseErrorMessage(error, "Transaction failed to submit"),
          { variant: "error" },
        );
        onError?.(error);
      }
    },
    [
      enabled,
      status,
      writeContractAsync,
      enqueueSnackbar,
      onError,
      pendingMessage,
      submittedMessage,
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
        queueMicrotask(() => {
          setStatus("error");
          enqueueSnackbar(
            parseErrorMessage(txReceipt.error, "Transaction failed"),
            { variant: "error" },
          );
          onError?.(txReceipt.error);
        });
      } else if (txReceipt.status === "success" && shouldWait) {
        queueMicrotask(() => {
          setStatus("success");
          const explorerLink = buildExplorerLink({ tx: txHash as Hex });
          enqueueSnackbar(successMessage, {
            variant: "success",
            action: txHash ? (
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
            ) : undefined,
          });
          onSuccess?.();
        });
      }
    }
  }, [
    status,
    txReceipt.isFetched,
    txReceipt.status,
    txReceipt.error,
    isSynced,
    waitForSync,
    enqueueSnackbar,
    onSuccess,
    onError,
    successMessage,
    txHash,
    buildExplorerLink,
  ]);

  return {
    execute,
    reset,
    status,
    isLoading:
      status === "executing" || isPending || (waitForSync && isWaiting),
    isExecuting: status === "executing",
    isSuccess: status === "success",
    isError: status === "error",
    isSyncing: status === "executing" && waitForSync && isWaiting,
    txReceipt,
    txHash,
  };
};
