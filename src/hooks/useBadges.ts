import { useInfiniteQuery } from "@tanstack/react-query";
import { BadgesDocument, BadgesQuery, execute } from "@/../.graphclient";

const PAGE_SIZE = 1000;

export const useBadges = (
  searchText: string = "",
  creatorAddress?: string,
  orderBy: "id" | "name" = "id",
  orderDirection: "asc" | "desc" = "asc",
) => {
  const normalizedSearchText = searchText.trim().replace(/\s+/g, " ");
  const normalizedCreatorAddress = creatorAddress
    ? creatorAddress.trim()
    : undefined;

  return useInfiniteQuery({
    queryKey: [
      "badges",
      normalizedCreatorAddress,
      normalizedSearchText,
      orderBy,
      orderDirection,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const where =
        normalizedSearchText === "" && !normalizedCreatorAddress
          ? undefined
          : {
              and: [
                ...(normalizedCreatorAddress
                  ? [
                      {
                        creatorAddress_contains_nocase:
                          normalizedCreatorAddress,
                      },
                    ]
                  : []),
                {
                  or: [
                    { name_contains_nocase: normalizedSearchText },
                    {
                      creatorAddress_contains_nocase: normalizedSearchText,
                    },
                  ],
                },
              ],
            };

      const res = await execute(BadgesDocument, {
        first: PAGE_SIZE,
        skip: pageParam * PAGE_SIZE,
        orderBy,
        orderDirection,
        where,
      });

      return res.data as BadgesQuery;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage?.badges?.length || lastPage.badges.length < PAGE_SIZE)
        return undefined;

      return pages.length;
    },
    placeholderData: (prev) => prev,
  });
};
