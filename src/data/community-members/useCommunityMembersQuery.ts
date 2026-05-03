import { useQuery } from "@tanstack/react-query";
import { CommunityMembersQueryOptions } from "./types";
import { fetchCommunityMembers, mergeOptions } from "./utils";

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
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
