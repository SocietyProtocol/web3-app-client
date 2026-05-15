import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchBadges, mergeOptions } from "./utils";
import { BadgeQueryOptions } from "./types";
import { TEN_MINUTES_IN_MS } from "@/consts/time";

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
    gcTime: TEN_MINUTES_IN_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
