"use client";

import { useCallback, useMemo } from "react";
import { useChainId } from "wagmi";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { getAuctionContractAddress } from "@/lib/wagmi";
import { useAuctionContext } from "../AuctionContext";
import { useSnackbar } from "notistack";
import { useTransaction } from "@/hooks/useTransaction";
import { subgraphOrderIdToHex } from "@/utils/auction";

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
  const chainId = useChainId();

  const contractAddress = useMemo(
    () => getAuctionContractAddress(chainId),
    [chainId],
  );

  const transaction = useTransaction({
    onSuccess: () => {
      refetch();
      refetchOrders();
      onSuccess?.();
    },
    onError,
    successMessage: "Bid canceled successfully",
  });

  const cancel = useCallback(async () => {
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
    cancel,
    reset: transaction.reset,
    status: transaction.status,
    isLoading: transaction.isLoading,
    isCanceling: transaction.isExecuting,
    isSuccess: transaction.isSuccess,
    isError: transaction.isError,
    isSyncing: transaction.isSyncing,
    txReceipt: transaction.txReceipt,
  };
};
