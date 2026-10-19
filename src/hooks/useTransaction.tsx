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
  useChainId,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Hex, TransactionReceipt } from "viem";
import { getPublicClient } from "wagmi/actions";
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
import {
  sendContractCall,
  walletSupportsSendCalls,
} from "@/lib/account-executor";
import { submitAccountWrite } from "@/lib/account-capabilities";
import { sendSponsoredUserOperation } from "@/lib/send-sponsored-user-operation";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { useOutpostRouting } from "@/hooks/useOutpostRouting";
import { resolveOutpostRoute } from "@/lib/outpost-routing";
import { wagmiConfig } from "@/lib/wagmi";

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
  const chainId = useChainId();
  const outpost = useOutpostAccount();

  // Pick the sender first. Sponsored and Light Account calls simulate as it.
  const routing = useOutpostRouting({
    address,
    abi,
    functionName,
    args,
    value,
    enabled: enabled && simulate,
  });
  const route = routing.route;
  const actsAsSmartAccount = !!route && route.kind !== "owner";

  const simulation = useSimulateContract(
    simulate && address && abi && functionName && args && enabled && route
      ? ({
          address,
          abi,
          functionName,
          args,
          ...(actsAsSmartAccount && route.sender
            ? { account: route.sender }
            : {}),

          ...(value !== undefined && { value }),

          query: {
            retry: false, // Don't retry simulation on failure
          },
        } as Parameters<typeof useSimulateContract>[0])
      : undefined,
  );
  const routeError =
    route?.kind === "blocked"
      ? (route.error ?? new Error(route.message ?? "This action would fail"))
      : undefined;

  const txReceipt = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { isSynced, isWaiting, isTimeout } = useWaitForSubgraphSync(
    txReceipt.data?.blockNumber,
  );

  // Estimate gas for the transaction
  const gasEstimation = useEstimateGas({
    address,
    abi,
    functionName,
    args,
    value,
    enabled: enabled && simulate && route?.kind === "owner",
  });

  // The Light Account pays from its own ETH: show the prefund it must hold.
  const smartAccountGasUsd =
    route?.kind === "smart-account" &&
    route.prefundWei !== undefined &&
    gasEstimation.priceUsd !== undefined
      ? (route.prefundWei * gasEstimation.priceUsd) /
        BigInt(10) ** BigInt(gasEstimation.decimalsWei)
      : undefined;

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

        if (outpost.isLoading) {
          throw new Error("Your account is still loading. Please try again in a moment.");
        }
        const callRoute = await resolveOutpostRoute(
          getPublicClient(wagmiConfig, { chainId: chainId as 1 | 11155111 }),
          {
            chainId,
            to: finalAddress,
            abi: finalAbi,
            functionName: finalFunctionName,
            args: finalArgs,
            value: finalValue,
            owner: outpost.ownerAddress,
            smartAccount: outpost.isSmartAccount ? outpost.address : undefined,
            isContractWallet: outpost.isContractWallet,
          },
        );
        if (callRoute.kind === "blocked") {
          throw callRoute.error ?? new Error(callRoute.message ?? "This action would fail");
        }

        const hash =
          callRoute.kind === "sponsored" || callRoute.kind === "smart-account"
            ? await sendSponsoredUserOperation({
                chainId,
                to: finalAddress,
                abi: finalAbi,
                functionName: finalFunctionName,
                args: finalArgs,
                value: finalValue,
                sponsor: callRoute.sponsor,
              })
            : await submitAccountWrite({
                supportsSendCalls: await walletSupportsSendCalls(chainId),
                write: () =>
                  writeContractAsync({
                    address: finalAddress,
                    abi: finalAbi,
                    functionName: finalFunctionName,
                    args: finalArgs,
                    ...(finalValue !== undefined && { value: finalValue }),
                  } as Parameters<typeof writeContractAsync>[0]),
                send: async () => {
                  enqueueSnackbar("Waiting for the transaction to execute", {
                    key: `${snackbarKeyPrefixFinal}-pending`,
                    variant: "info",
                  });
                  return sendContractCall({
                    chainId,
                    address: finalAddress,
                    abi: finalAbi as readonly unknown[],
                    functionName: finalFunctionName,
                    args: finalArgs,
                    value: finalValue,
                  });
                },
              });

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
      chainId,
      outpost.isLoading,
      outpost.ownerAddress,
      outpost.address,
      outpost.isSmartAccount,
      outpost.isContractWallet,
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
      const shouldWait = waitForSync ? isSynced || isTimeout : true;

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
    isTimeout,
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
      isError: simulation.isError || !!routeError,
      error: routeError ?? simulation.error,
      isFetching: simulation.isFetching || routing.isLoading,
      isLoading: simulation.isLoading || routing.isLoading,
      isSuccess: simulation.isSuccess && !routeError,
    },

    // Who will send it: "sponsored" / "smart-account" act as the Light
    // Account, "owner" as the connected wallet.
    sender: route?.sender,
    route,

    // Gas estimation
    gas:
      route?.kind === "sponsored"
        ? BigInt(0)
        : route?.kind === "smart-account"
          ? smartAccountGasUsd
          : gasEstimation.totalUsd,
    gasLoading:
      routing.isLoading ||
      (route?.kind === "owner" && gasEstimation.isLoading),
    gasError: route?.kind === "owner" && gasEstimation.isError,
    txReceipt,
    txHash,
  };
};
