import { useInfiniteQuery } from "@tanstack/react-query";
import { CommunityQueryOptions } from "./types";
import { fetchCommunities, mergeOptions } from "./utils";

export const useCommunitiesQuery = (options?: CommunityQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  return useInfiniteQuery({
    queryKey: ["communities", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await fetchCommunities({
        ...mergedOptions,
        skip: pageParam * mergedOptions.pageSize,
      });

      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (
        !lastPage?.communities?.length ||
        lastPage.communities.length < mergedOptions.pageSize
      )
        return undefined;

      return pages.length;
    },
    placeholderData: (prev) => prev,
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
