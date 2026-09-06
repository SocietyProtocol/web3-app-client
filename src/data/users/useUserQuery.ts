import { useQuery } from "@tanstack/react-query";
import { Address, isAddress } from "viem";
import { execute, UserDocument, UserQuery } from "../../../.graphclient";
import { requireGraphData } from "@/lib/graph-response";

export const useUserQuery = (address?: Address) =>
  useQuery({
    queryKey: ["user", address?.toLowerCase()],
    queryFn: async () => {
      if (!address) {
        return null;
      }

      const res = await execute(UserDocument, {
        id: address.toLowerCase(),
      });

      return requireGraphData(res.data as UserQuery | undefined, "User").user;
    },
    enabled: !!address && isAddress(address),
  });
