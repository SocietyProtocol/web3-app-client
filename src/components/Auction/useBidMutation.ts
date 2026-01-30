"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scaleUp } from "@/utils/bigint";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, Hex } from "viem";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { getAuctionContractAddress } from "@/lib/wagmi";
import { useAllowance } from "@/hooks/erc20/useAllowance";
import { useAuctionContext } from "./AuctionContext";
import { useWaitForSubgraphSync } from "@/hooks/useWaitForSubgraphSync";

interface UseBidMutationValues {
  sellAmount?: bigint;
  price?: bigint;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

type BidMutationStatus = "idle" | "approving" | "bidding" | "success" | "error";

export const useBidMutation = ({
  sellAmount,
  price,
  onSuccess,
  onError,
}: UseBidMutationValues) => {
  const [status, setStatus] = useState<BidMutationStatus>("idle");
  const [approveTransactionHash, setApproveTransactionHash] = useState<Hex>();
  const [bidTransactionHash, setBidTransactionHash] = useState<Hex>();

  const { address } = useAccount();

  const { auctionDetail, refetch, refetchOrders } = useAuctionContext();

  const chainId = useChainId();

  const contractAddress = useMemo(
    () => getAuctionContractAddress(chainId),
    [chainId],
  );

  const { auctionId, addressBiddingToken, decimalsAuctioningToken } =
    auctionDetail ?? {};

  const userBiddingTokenAllowance = useAllowance({
    ownerAddress: address,
    spenderAddress: contractAddress,
    tokenAddress: addressBiddingToken,
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveTransactionHash,
  });

  const bidReceipt = useWaitForTransactionReceipt({
    hash: bidTransactionHash,
  });

  const { isSynced, isWaiting } = useWaitForSubgraphSync(
    bidReceipt.data?.blockNumber,
  );

  const approveRequired = useMemo(() => {
    if (
      sellAmount === undefined ||
      userBiddingTokenAllowance.data === undefined
    ) {
      return false;
    }

    return userBiddingTokenAllowance.data < sellAmount;
  }, [sellAmount, userBiddingTokenAllowance.data]);

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

    return scaleUp(sellAmount, decimalsAuctioningToken) / price;
  }, [sellAmount, price, decimalsAuctioningToken]);

  const placeBid = useCallback(async () => {
    if (
      addressBiddingToken === undefined ||
      sellAmount === undefined ||
      userBiddingTokenAllowance.data === undefined ||
      status === "approving" ||
      status === "bidding"
    ) {
      return;
    }

    if (userBiddingTokenAllowance.data < sellAmount) {
      setStatus("approving");
      const hash = await writeContractAsync({
        address: addressBiddingToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress, sellAmount],
      });
      setApproveTransactionHash(hash);
      return;
    }

    if (auctionId === undefined || buyAmount === undefined) {
      return;
    }

    setStatus("bidding");

    const hash = await writeContractAsync({
      address: contractAddress,
      abi: EasyAuctionAbi,
      functionName: "placeSellOrders",
      args: [
        BigInt(auctionId),
        [buyAmount],
        [sellAmount],
        [
          "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
        ],
        "0x" as Hex,
      ],
    });
    setBidTransactionHash(hash);
  }, [
    addressBiddingToken,
    sellAmount,
    userBiddingTokenAllowance.data,
    status,
    auctionId,
    buyAmount,
    writeContractAsync,
    contractAddress,
  ]);

  useEffect(() => {
    if (status === "approving" && approveReceipt.isFetched) {
      userBiddingTokenAllowance.refetch();
      setStatus("idle");
      placeBid();
    }
  }, [status, approveReceipt.isFetched, placeBid, userBiddingTokenAllowance]);

  useEffect(() => {
    if (status === "bidding" && bidReceipt.isFetched) {
      userBiddingTokenAllowance.refetch();
      if (bidReceipt.status === "error") {
        setStatus("error");

        onError?.(bidReceipt.error);
      } else if (bidReceipt.status === "success" && isSynced) {
        setStatus("success");
        onSuccess?.();
        refetch();
        refetchOrders();
      }
    }
  }, [
    status,
    bidReceipt,
    isSynced,
    refetch,
    refetchOrders,
    onError,
    onSuccess,
    userBiddingTokenAllowance,
  ]);

  return {
    mutate: placeBid,
    isLoading:
      status === "approving" || status === "bidding" || isPending || isWaiting,
    isApproving: status === "approving",
    isBidding: status === "bidding",
    isSuccess: status === "success",
    isError: status === "error",
    isSyncing: status === "bidding" && isWaiting,
    approveRequired,
    bidReceipt,
    approveReceipt,
  };
};
