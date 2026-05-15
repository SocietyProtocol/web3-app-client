import { useQuery } from "@tanstack/react-query";
import { fetchCommunity } from "./utils";

export const useCommunity = (id?: string) => {
  return useQuery({
    queryKey: ["community", id],
    queryFn: async () => {
      if (!id) throw new Error("Community ID is required");
      return fetchCommunity(id);
    },
    enabled: !!id,
  });
};
