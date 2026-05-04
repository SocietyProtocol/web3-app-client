import { useQuery } from "@tanstack/react-query";
import { CommunityMembersQueryOptions } from "./types";
import { fetchCommunityMembers, mergeOptions } from "./utils";
import { TEN_MINUTES_IN_MS } from "@/consts/time";

export const useCommunityMembersQuery = (
  options?: CommunityMembersQueryOptions,
) => {
  const mergedOptions = mergeOptions(options);

  return useQuery({
    queryKey: ["communityMembers", mergedOptions],
    queryFn: async () => {
      const result = await fetchCommunityMembers(mergedOptions);

      return result;
    },
    placeholderData: (prev) => prev,
    gcTime: TEN_MINUTES_IN_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!options?.communityId,
  });
};
