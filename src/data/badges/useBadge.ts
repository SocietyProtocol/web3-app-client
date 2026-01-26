import { useQuery } from "@tanstack/react-query";
import { fetchBadge } from "./utils";

export const useBadge = (id?: string) => {
  return useQuery({
    queryKey: ["badge", id],
    queryFn: async () => {
      if (!id) throw new Error("Badge ID is required");
      return fetchBadge(id);
    },
    enabled: !!id,
  });
};
