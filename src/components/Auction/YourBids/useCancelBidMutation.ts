"use client";

import { useCallback } from "react";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { useAuctionContext } from "../AuctionContext";
import { useSnackbar } from "notistack";
import { useTransaction } from "@/hooks/useTransaction";
import { subgraphOrderIdToHex } from "@/utils/auction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

interface UseCancelBidMutationParams {
  orderId?: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const useCancelBidMutation = ({
  orderId,
  onSuccess,
  onError,
}: UseCancelBidMutationParams) => {
  const { enqueueSnackbar } = useSnackbar();
  const { refetch, refetchOrders } = useAuctionContext();

  const contractAddress = useChainVar(contracts.auction);

  const transaction = useTransaction({
    onSuccess: () => {
      refetch();
      refetchOrders();
      onSuccess?.();
    },
    onError,
    successMessage: "Bid canceled successfully",
  });

  const mutate = useCallback(async () => {
    if (!orderId) {
      enqueueSnackbar("Missing required parameters", { variant: "error" });
      return;
    }

    // Convert subgraph order ID format to hex format for contract
    const { hexOrderId, auctionId } = subgraphOrderIdToHex(orderId);

    await transaction.execute({
      address: contractAddress,
      abi: EasyAuctionAbi,
      functionName: "cancelSellOrders",
      args: [BigInt(auctionId), [hexOrderId]],
    });
  }, [orderId, contractAddress, transaction, enqueueSnackbar]);

  return {
    mutate,
    reset: transaction.reset,
    status: transaction.status,
    isLoading: transaction.isLoading,
    isMutating: transaction.isExecuting,
    isSuccess: transaction.isSuccess,
    isError: transaction.isError,
    isSyncing: transaction.isSyncing,
    txReceipt: transaction.txReceipt,
  };
};
