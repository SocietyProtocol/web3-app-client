import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";

export const useSubgraphUser = (address?: Address) => useQuery({
    queryKey: ["subgraphUser", address],
    queryFn: async () => {
        if (!address) {
            return null;
        }

        
})