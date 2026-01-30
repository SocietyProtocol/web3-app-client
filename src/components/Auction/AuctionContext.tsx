"use client";
import { createContext, useContext, useMemo } from "react";
import { AuctionQuery, OrdersQuery } from "../../../.graphclient";
import { useAuction } from "@/data/auction/useAuction";
import { scaleUp } from "@/utils/bigint";
import { formatUnits } from "viem";
import { useOrders } from "@/data/orders/useOrders";
import { useAccount } from "wagmi";

export interface AuctionContextValue {
  auctionId?: number;
  auctionDetail?: AuctionQuery["auctionDetail"];
  minPrice?: bigint;
  minBid?: bigint;
  totalAuctioned?: string;
  isLoading: boolean;
  refetch: () => void;
  orders?: OrdersQuery["orders"];
  isOrdersLoading: boolean;
  refetchOrders: () => void;
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

  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useOrders(auctionId, address);

  const {
    minimumBiddingAmountPerOrder,
    decimalsAuctioningToken,
    currentVolume,
    exactOrder,
  } = auctionData?.auctionDetail ?? {};

  const minBid = useMemo(
    () =>
      minimumBiddingAmountPerOrder
        ? Number(minimumBiddingAmountPerOrder)
        : undefined,
    [minimumBiddingAmountPerOrder],
  );

  const minPrice = useMemo(
    () =>
      exactOrder
        ? scaleUp(
            BigInt(exactOrder.buyAmount),
            Number(decimalsAuctioningToken),
          ) / BigInt(exactOrder.sellAmount)
        : undefined,
    [exactOrder, decimalsAuctioningToken],
  );

  const totalAuctioned = useMemo(() => {
    if (currentVolume === undefined || decimalsAuctioningToken === undefined) {
      return undefined;
    }
    return formatUnits(BigInt(currentVolume), Number(decimalsAuctioningToken));
  }, [currentVolume, decimalsAuctioningToken]);

  const value = useMemo(
    () => ({
      auctionId,
      auctionDetail: auctionData?.auctionDetail,
      minBid: minBid !== undefined ? BigInt(minBid) : undefined,
      minPrice: minPrice,
      totalAuctioned,
      isLoading,
      refetch,
      orders: ordersData?.orders,
      isOrdersLoading,
      refetchOrders,
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
