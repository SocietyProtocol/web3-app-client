import { useInfiniteQuery } from "@tanstack/react-query";
import { BadgesDocument, BadgesQuery, execute } from "@/../.graphclient";

const PAGE_SIZE = 1000;

export const useBadges = (
  orderBy: "id" | "name" = "id",
  orderDirection: "asc" | "desc" = "asc",
) => {
  return useInfiniteQuery({
    queryKey: ["badges", orderBy, orderDirection],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await execute(BadgesDocument, {
        first: PAGE_SIZE,
        skip: pageParam * PAGE_SIZE,
        orderBy,
        orderDirection,
      });

      return res.data as BadgesQuery;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage?.badges?.length || lastPage.badges.length < PAGE_SIZE)
        return undefined;
      return pages.length;
    },
  });
};
