import { useQuery } from "@tanstack/react-query";
import { Address, isAddress } from "viem";
import { execute, UserDocument, UserQuery } from "../../../.graphclient";

export const useSubgraphUser = (address?: Address) =>
  useQuery({
    queryKey: ["subgraphUser", address],
    queryFn: async () => {
      if (!address) {
        return null;
      }

      const res = await execute(UserDocument, {
        id: address.toLowerCase(),
      });

      return res.data as UserQuery;
    },
    enabled: !!address && isAddress(address),
  });
