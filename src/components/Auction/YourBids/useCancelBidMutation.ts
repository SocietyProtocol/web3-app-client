"use client";

import { useCallback, useMemo } from "react";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { useTransaction } from "@/hooks/useTransaction";
import { subgraphOrderIdToHex } from "@/utils/auction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { Hex } from "viem";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const contractAddress = useChainVar(contracts.auction);

  // Convert subgraph order ID format to hex format for contract
  const cancelArgs = useMemo(() => {
    if (!orderId) return undefined;

    const { hexOrderId, auctionId } = subgraphOrderIdToHex(orderId);
    return [BigInt(auctionId), [hexOrderId]] as [bigint, Hex[]];
  }, [orderId]);

  const handleSuccess = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["auction"] }),
    ]);
    onSuccess?.();
  }, [queryClient, onSuccess]);

  return useTransaction({
    address: contractAddress,
    abi: EasyAuctionAbi,
    functionName: "cancelSellOrders",
    args: cancelArgs,
    onSuccess: handleSuccess,
    onError,
    successMessage: "Bid canceled successfully",
  });
};
