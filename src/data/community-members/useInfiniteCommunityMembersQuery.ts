import { useInfiniteQuery } from "@tanstack/react-query";
import { CommunityMembersQueryOptions } from "./types";
import { fetchCommunityMembers, mergeOptions } from "./utils";
import { ROWS_PER_PAGE } from "./consts";

export const useInfiniteCommunityMembersQuery = (
  options?: Omit<CommunityMembersQueryOptions, "skip">,
) => {
  const mergedOptions = mergeOptions(options);

  return useInfiniteQuery({
    queryKey: ["communityMembersInfinite", mergedOptions],
    queryFn: async ({ pageParam }) => {
      return fetchCommunityMembers({
        ...mergedOptions,
        pageSize: ROWS_PER_PAGE + 1,
        skip: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const count = lastPage.memberJoinedActivities?.length ?? 0;
      return count >= ROWS_PER_PAGE
        ? (lastPageParam as number) + ROWS_PER_PAGE
        : undefined;
    },
    enabled: !!options?.communityId,
    placeholderData: (prev) => prev,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
