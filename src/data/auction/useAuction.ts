import { useQuery } from "@tanstack/react-query";
import { fetchAuction } from "./utils";

export const useAuction = (auctionId?: number) =>
  useQuery({
    queryKey: ["auction", auctionId],
    queryFn: () => {
      if (!auctionId) {
        return undefined;
      }
      return fetchAuction(auctionId);
    },
    enabled: !!auctionId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
