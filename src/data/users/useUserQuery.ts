import { useQuery } from "@tanstack/react-query";
import { Address, isAddress } from "viem";
import { execute, UserDocument, UserQuery } from "../../../.graphclient";

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

      return res.data.user as UserQuery["user"];
    },
    enabled: !!address && isAddress(address),
  });
