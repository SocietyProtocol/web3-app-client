import { useInfiniteQuery } from "@tanstack/react-query";
import { BadgesDocument, BadgesQuery, execute } from "@/../.graphclient";
import { buildWhereClause, mergeOptions } from "./utils";
import { BadgeQueryOptions } from "./types";

export const useBadgesQuery = (options?: BadgeQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const where = buildWhereClause({
    searchText: mergedOptions.searchText,
    creatorAddress: mergedOptions.creatorAddress,
    managerAddress: mergedOptions.managerAddress,
    holderAddress: mergedOptions.holderAddress,
  });

  return useInfiniteQuery({
    queryKey: ["badges", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await execute(BadgesDocument, {
        first: mergedOptions.pageSize,
        skip: pageParam * mergedOptions.pageSize,
        orderBy: mergedOptions.orderBy,
        orderDirection: mergedOptions.orderDirection,
        where,
      });

      return res.data as BadgesQuery;
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
  });
};
