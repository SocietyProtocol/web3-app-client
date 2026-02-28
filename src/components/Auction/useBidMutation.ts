"use client";

import { useCallback, useEffect, useMemo } from "react";
import { scaleUp } from "@/utils/bigint";
import { Hex } from "viem";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { useAuctionContext } from "./AuctionContext";
import { useSnackbar } from "notistack";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useTransactionWithApproval } from "@/hooks/useTransactionWithApproval";

const PREV_SELL_ORDER =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

interface UseBidMutationValues {
  sellAmount?: bigint;
  price?: bigint;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  enabled?: boolean;
}

export const useBidMutation = ({
  sellAmount,
  price,
  onSuccess,
  onError,
  enabled = true,
}: UseBidMutationValues) => {
  const { enqueueSnackbar } = useSnackbar();
  const { auctionDetail, refetch, refetchOrders } = useAuctionContext();

  const contractAddress = useChainVar(contracts.auction);

  const { auctionId, addressBiddingToken, decimalsAuctioningToken } =
    auctionDetail ?? {};

  // Calculate buyAmount (Auctioning Token i.e. SPEC) based on sellAmount and price
  const buyAmount = useMemo(() => {
    if (
      decimalsAuctioningToken === undefined ||
      sellAmount === undefined ||
      price === undefined ||
      price === BigInt(0) ||
      sellAmount === BigInt(0)
    ) {
      return undefined;
    }

    const decimals = Number(decimalsAuctioningToken);

    if (Number.isNaN(decimals)) {
      return undefined;
    }

    return scaleUp(sellAmount, decimals) / price;
  }, [sellAmount, price, decimalsAuctioningToken]);

  const transaction = useTransactionWithApproval({
    tokenAddress: addressBiddingToken,
    spenderAddress: contractAddress,
    amount: sellAmount,
    address: contractAddress,
    abi: EasyAuctionAbi,
    functionName: "placeSellOrders",
    args:
      auctionId !== undefined &&
      buyAmount !== undefined &&
      sellAmount !== undefined
        ? [
            BigInt(auctionId),
            [buyAmount],
            [sellAmount],
            [PREV_SELL_ORDER],
            "0x" as Hex,
          ]
        : undefined,
    onSuccess: () => {
      refetch();
      refetchOrders();
      onSuccess?.();
    },
    onError,
    enabled,
  });

  const placeBid = useCallback(async () => {
    if (
      transaction.isExecuting ||
      transaction.isLoading ||
      transaction.isSyncing
    ) {
      return;
    }

    if (
      auctionId === undefined ||
      buyAmount === undefined ||
      sellAmount === undefined
    ) {
      enqueueSnackbar("Missing required bid parameters", { variant: "error" });
      return;
    }

    await transaction.execute();
  }, [auctionId, buyAmount, sellAmount, transaction, enqueueSnackbar]);

  // Auto-execute transaction after approval
  useEffect(() => {
    if (
      transaction.status === "approving" &&
      transaction.approveReceipt.status === "success" &&
      auctionId !== undefined &&
      buyAmount !== undefined &&
      sellAmount !== undefined
    ) {
      enqueueSnackbar("Approval confirmed, placing bid...", {
        variant: "success",
      });

      placeBid();
    }
  }, [
    transaction,
    auctionId,
    buyAmount,
    sellAmount,
    contractAddress,
    enqueueSnackbar,
    placeBid,
  ]);

  return {
    mutate: placeBid,
    reset: transaction.reset,
    isLoading: transaction.isLoading,
    isApproving: transaction.isApproving,
    isMutating: transaction.isExecuting,
    isSuccess: transaction.isSuccess,
    isError: transaction.isError,
    isSyncing: transaction.isSyncing,
    approveRequired: transaction.approveRequired,
    bidReceipt: transaction.txReceipt,
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
