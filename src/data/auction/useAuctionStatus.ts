import { useQuery } from "@tanstack/react-query";
import { fetchAuctionStatus } from "./utils";
import { useNow } from "@/hooks/useNow";
import { useMemo } from "react";
import { AuctionStatusEnum } from "@/components/Auction/types";
import { env } from "@/lib/env";

export const useAuctionStatus = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["auctionStatus", env.auctionId],
    queryFn: () => {
      if (env.auctionId === undefined) {
        return undefined;
      }
      return fetchAuctionStatus(env.auctionId);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: (prev) => prev,
    enabled: env.auctionId !== undefined,
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
