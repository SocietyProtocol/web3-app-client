import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBadges, mergeOptions } from "./utils";
import { BadgeQueryOptions } from "./types";

export const useBadgesQuery = (options?: BadgeQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["badges", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await fetchBadges({
        ...mergedOptions,
        skip: pageParam * mergedOptions.pageSize,
      });

      result.badges.forEach((badge) => {
        queryClient.setQueryData(["badge", badge.id], badge);
      });

      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (
        !lastPage?.badges?.length ||
        lastPage.badges.length < mergedOptions.pageSize
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
