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
import { Abi, Hex, TransactionReceipt, encodeFunctionData } from "viem";
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
import { sendOutpostWrite } from "@/lib/outpost-send";
import { freeGasUnavailableNotice, quoteOwnerPays } from "@/lib/owner-pays";
import { ownerWalletClient } from "@/lib/owner-wallet";
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

  // Pick the sender first. Calls the Light Account makes simulate as it,
  // whether Society or the owner wallet pays.
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

  // The owner wallet pays through the Light Account: show the wallet's cost.
  const throughAccountGasUsd =
    route?.kind === "owner-through-account" &&
    route.gasWei !== undefined &&
    gasEstimation.priceUsd !== undefined
      ? (route.gasWei * gasEstimation.priceUsd) /
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
        const walletChainId = chainId as 1 | 11155111;
        const publicClient = getPublicClient(wagmiConfig, { chainId: walletChainId });
        const smartAccount = outpost.isSmartAccount ? outpost.address : undefined;
        const callRoute = await resolveOutpostRoute(publicClient, {
          chainId,
          to: finalAddress,
          abi: finalAbi,
          functionName: finalFunctionName,
          args: finalArgs,
          value: finalValue,
          owner: outpost.ownerAddress,
          smartAccount,
          isContractWallet: outpost.isContractWallet,
        });

        const notify = (message: string) => {
          closeSnackbar(`${snackbarKeyPrefixFinal}-pending`);
          closeSnackbar(`${snackbarKeyPrefixFinal}-notice`);
          enqueueSnackbar(message, {
            key: `${snackbarKeyPrefixFinal}-notice`,
            variant: "info",
            persist: true,
          });
        };
        const accountCall = () => ({
          to: finalAddress,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: finalAbi as Abi,
            functionName: finalFunctionName,
            args: finalArgs ?? [],
          }),
        });
        let fellBack = false;
        const requirePublicClient = () => {
          if (!publicClient) throw new Error("Network is not available");
          return publicClient;
        };

        const hash = await sendOutpostWrite(
          {
            sendSponsored: () =>
              sendSponsoredUserOperation({
                chainId,
                to: finalAddress,
                abi: finalAbi,
                functionName: finalFunctionName,
                args: finalArgs,
                value: finalValue,
              }),
            sendAsOwner: async () =>
              submitAccountWrite({
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
              }),
            simulateAsAccount: () =>
              requirePublicClient().simulateContract({
                address: finalAddress,
                abi: finalAbi as Abi,
                functionName: finalFunctionName,
                args: finalArgs ?? [],
                account: smartAccount,
              }),
            quoteOwnerPays: () => {
              if (!outpost.ownerAddress) throw new Error("Wallet is not connected");
              return quoteOwnerPays(requirePublicClient(), {
                owner: outpost.ownerAddress,
                calls: [accountCall()],
              });
            },
            ownerWallet: async () => {
              const client = requirePublicClient();
              const wallet = await ownerWalletClient(walletChainId);
              return {
                sendTransaction: (transaction) => wallet.sendTransaction(transaction),
                waitForReceipt: (receiptHash) =>
                  client.waitForTransactionReceipt({ hash: receiptHash }),
                getCode: (codeAddress, blockNumber) =>
                  client.getCode({
                    address: codeAddress,
                    ...(blockNumber !== undefined && { blockNumber }),
                  }),
                estimateGas: (transaction, from, blockNumber) =>
                  client.estimateGas({
                    account: from,
                    ...transaction,
                    ...(blockNumber !== undefined && { blockNumber }),
                  }),
              };
            },
            onSponsorshipUnavailable: (quote, reason) => {
              console.warn("Sponsorship unavailable; the owner wallet pays instead:", reason);
              fellBack = true;
              notify(freeGasUnavailableNotice(quote));
            },
            onOwnerPaysStep: (step, { steps }) => {
              if (steps < 2) return;
              if (step === "deploy") {
                // After a fallback the free-gas notice already names both steps.
                if (!fellBack) {
                  notify("Step 1 of 2: confirm setting up your Society account in your wallet");
                }
                return;
              }
              notify(
                fellBack
                  ? "Step 2 of 2: confirm the action in your wallet. Free gas is unavailable right now, so your wallet pays the network fee."
                  : "Step 2 of 2: confirm the action in your wallet",
              );
            },
          },
          {
            route: callRoute,
            owner: outpost.ownerAddress,
            call: accountCall,
          },
        );

        setTxHash(hash);
        closeSnackbar(`${snackbarKeyPrefixFinal}-pending`);
        closeSnackbar(`${snackbarKeyPrefixFinal}-notice`);
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
        closeSnackbar(`${snackbarKeyPrefixFinal}-notice`);

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

    // Who acts: "sponsored" / "owner-through-account" act as the Light
    // Account, "owner" as the connected wallet. Only "sponsored" is free;
    // the connected wallet pays for the other two.
    sender: route?.sender,
    route,

    // Gas estimation
    gas:
      route?.kind === "sponsored"
        ? BigInt(0)
        : route?.kind === "owner-through-account"
          ? throughAccountGasUsd
          : gasEstimation.totalUsd,
    gasLoading:
      routing.isLoading ||
      (route?.kind === "owner" && gasEstimation.isLoading),
    gasError: route?.kind === "owner" && gasEstimation.isError,
    txReceipt,
    txHash,
  };
};
