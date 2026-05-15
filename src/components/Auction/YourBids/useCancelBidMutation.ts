"use client";

import { useMemo } from "react";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { useTransaction } from "@/hooks/useTransaction";
import { subgraphOrderIdToHex } from "@/utils/auction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { Hex, TransactionReceipt } from "viem";
import { capturePostHogEvent } from "@/lib/posthog";
import { useAccount } from "wagmi";

interface UseCancelBidMutationParams {
  orderId?: string;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export const useCancelBidMutation = ({
  orderId,
  onSuccess,
  onError,
}: UseCancelBidMutationParams) => {
  const contractAddress = useChainVar(contracts.auction);
  const { address } = useAccount();

  // Convert subgraph order ID format to hex format for contract
  const cancelArgs = useMemo(() => {
    if (!orderId) return undefined;

    const { hexOrderId, auctionId } = subgraphOrderIdToHex(orderId);
    return [BigInt(auctionId), [hexOrderId]] as [bigint, Hex[]];
  }, [orderId]);

  return useTransaction({
    address: contractAddress,
    abi: EasyAuctionAbi,
    functionName: "cancelSellOrders",
    args: cancelArgs,
    queryKeysToInvalidateOnSuccess: [["orders"], ["auction"]],
    onSuccess: (receipt) => {
      capturePostHogEvent("bid_canceled", {
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
        order_id: orderId,
        auction_id: cancelArgs?.[0]?.toString(),
      });
      onSuccess?.(receipt);
    },
    onError,
    successMessage: "Bid canceled successfully",
  });
};
