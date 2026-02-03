"use client";
import { createContext, useContext, useMemo } from "react";
import { AuctionQuery, OrdersQuery } from "../../../.graphclient";
import { useAuction } from "@/data/auction/useAuction";
import { min, scaleUp } from "@/utils/bigint";
import { parseUnits } from "viem";
import { useOrders } from "@/data/orders/useOrders";
import { useAccount } from "wagmi";
import { useAuctionDemandCurve } from "@/data/orders/useAuctionDemandCurve";
import { useNow } from "@/hooks/useNow";

export interface AuctionContextValue {
  auctionId?: number;
  auctionDetail?: AuctionQuery["auctionDetail"];
  minPrice?: bigint;
  minBid?: bigint;
  totalAuctioned?: bigint;
  isLoading: boolean;
  refetch: () => void;
  orders?: OrdersQuery["orders"];
  isOrdersLoading: boolean;
  refetchOrders: () => void;
  priceVolumeHistogram?: { label: number; value: number }[];
  isCancellationPastDeadline: boolean;
}

export const AuctionContext = createContext<AuctionContextValue | undefined>(
  undefined,
);

interface AuctionProviderProps {
  auctionId?: number;
  children: React.ReactNode;
}

export const AuctionProvider = ({
  auctionId,
  children,
}: AuctionProviderProps) => {
  const { address } = useAccount();
  const { data: auctionData, isLoading, refetch } = useAuction(auctionId);

  const now = useNow({
    updateAt: auctionData?.auctionDetail?.orderCancellationEndDate
      ? Number(auctionData.auctionDetail.orderCancellationEndDate)
      : undefined,
  });

  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useOrders(auctionId, address);

  const {
    minimumBiddingAmountPerOrder,
    decimalsAuctioningToken,
    decimalsBiddingToken,
    currentBiddingAmount,
    currentClearingPrice,
    exactOrder,
    orders: allOrders,
  } = auctionData?.auctionDetail ?? {};

  const minBid = useMemo(
    () =>
      minimumBiddingAmountPerOrder
        ? BigInt(minimumBiddingAmountPerOrder)
        : undefined,
    [minimumBiddingAmountPerOrder],
  );

  const minPrice = useMemo(() => {
    if (!exactOrder || decimalsAuctioningToken === undefined) {
      return undefined;
    }

    const sellAmountBigInt = BigInt(exactOrder.sellAmount);

    if (sellAmountBigInt === BigInt(0)) {
      return undefined;
    }

    return (
      scaleUp(BigInt(exactOrder.buyAmount), Number(decimalsAuctioningToken)) /
      sellAmountBigInt
    );
  }, [exactOrder, decimalsAuctioningToken]);

  const totalAuctioned = useMemo(() => {
    if (
      exactOrder === undefined ||
      currentBiddingAmount === undefined ||
      currentClearingPrice === undefined ||
      decimalsAuctioningToken === undefined ||
      decimalsBiddingToken === undefined
    ) {
      return undefined;
    }

    return min(
      BigInt(exactOrder.sellAmount),
      scaleUp(BigInt(currentBiddingAmount), Number(decimalsAuctioningToken)) /
        parseUnits(currentClearingPrice, Number(decimalsBiddingToken)),
    );
  }, [
    currentBiddingAmount,
    currentClearingPrice,
    decimalsAuctioningToken,
    decimalsBiddingToken,
    exactOrder,
  ]);

  const priceVolumeHistogram = useAuctionDemandCurve(
    useMemo(
      () => allOrders?.filter((order) => order.id !== exactOrder?.id),
      [exactOrder?.id, allOrders],
    ),
    decimalsAuctioningToken === undefined
      ? undefined
      : Number(decimalsAuctioningToken),
  );

  const isCancellationPastDeadline = useMemo(
    () =>
      auctionData?.auctionDetail?.orderCancellationEndDate
        ? now > Number(auctionData.auctionDetail.orderCancellationEndDate)
        : false,
    [auctionData?.auctionDetail?.orderCancellationEndDate, now],
  );

  const value = useMemo(
    () => ({
      auctionId,
      auctionDetail: auctionData?.auctionDetail,
      minBid,
      minPrice,
      totalAuctioned,
      isLoading,
      refetch,
      orders: ordersData?.orders,
      isOrdersLoading,
      refetchOrders,
      priceVolumeHistogram,
      isCancellationPastDeadline,
    }),
    [
      auctionId,
      auctionData?.auctionDetail,
      minBid,
      minPrice,
      totalAuctioned,
      isLoading,
      refetch,
      ordersData?.orders,
      isOrdersLoading,
      refetchOrders,
      priceVolumeHistogram,
      isCancellationPastDeadline,
    ],
  );

  return (
    <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
  );
};

export const useAuctionContext = () => {
  const context = useContext(AuctionContext);

  if (!context) {
    throw new Error("useAuctionContext must be used within an AuctionProvider");
  }
  return context;
};
