import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "./utils";
import { Hex } from "viem";

export const useOrders = (auctionId?: number, user?: Hex) =>
  useQuery({
    queryKey: ["orders", auctionId, user?.toLowerCase()],
    queryFn: () => {
      if (!auctionId || !user) {
        return undefined;
      }
      return fetchOrders(auctionId, user);
    },
    enabled: !!auctionId && !!user,
    staleTime: Infinity,
    gcTime: Infinity,
  });
