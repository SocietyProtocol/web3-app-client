"use client";

import { useNow } from "@/hooks/useNow";
import { useMemo } from "react";
import { ActiveAuction } from "./ActiveAuction";
import { InactiveAuction } from "./InactiveAuction";
import { useAuctionContext } from "./AuctionContext";
import { AuctionDetailsSkeleton } from "./AuctionDetailsSkeleton";

export const AuctionDetails = () => {
  const { auctionDetail, isLoading } = useAuctionContext();
  const { startingTimeStamp, endTimeTimestamp } = auctionDetail || {};
  const currentTime = useNow();

  const isActive = useMemo(() => {
    return (
      startingTimeStamp !== undefined &&
      endTimeTimestamp !== undefined &&
      currentTime >= Number(startingTimeStamp) &&
      currentTime <= Number(endTimeTimestamp)
    );
  }, [currentTime, endTimeTimestamp, startingTimeStamp]);

  if (isLoading) {
    return <AuctionDetailsSkeleton />;
  }

  return isActive ? <ActiveAuction /> : <InactiveAuction />;
};
