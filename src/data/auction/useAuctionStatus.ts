import { useQuery } from "@tanstack/react-query";
import { fetchAuctionStatus } from "./utils";
import { useNow } from "@/hooks/useNow";
import { useMemo } from "react";
import { AuctionStatusEnum } from "@/components/Auction/types";

const auctionId = process.env.NEXT_PUBLIC_AUCTION_ID
  ? parseInt(process.env.NEXT_PUBLIC_AUCTION_ID)
  : undefined;

export const useAuctionStatus = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["auctionStatus", auctionId],
    queryFn: () => {
      if (!auctionId) {
        return undefined;
      }
      return fetchAuctionStatus(auctionId);
    },
    enabled: !!auctionId,
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: (prev) => prev,
  });

  const { endTimeTimestamp } = data?.auctionDetail || {};
  const currentTime = useNow({
    updateAt: endTimeTimestamp ? Number(endTimeTimestamp) : undefined,
  });

  const status = useMemo(() => {
    if (endTimeTimestamp === undefined) {
      return AuctionStatusEnum.INACTIVE;
    }

    if (currentTime > Number(endTimeTimestamp)) {
      return AuctionStatusEnum.ENDED;
    }

    return AuctionStatusEnum.ACTIVE;
  }, [currentTime, endTimeTimestamp]);

  return {
    status,
    isLoading,
  };
};
