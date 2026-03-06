import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchBadges, mergeOptions } from "./utils";
import { BadgeQueryOptions } from "./types";

export const useBadgesQuery = (options?: BadgeQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  return useInfiniteQuery({
    queryKey: ["badges", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await fetchBadges({
        ...mergedOptions,
        skip: pageParam * mergedOptions.pageSize,
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
