import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { CommunityMembersQueryOptions } from "./types";
import { fetchCommunityMembers, mergeOptions } from "./utils";
import { ROWS_PER_PAGE } from "./consts";
import { CommunityMembersQuery } from "../../../.graphclient";
import { TEN_MINUTES_IN_MS } from "@/consts/time";

export type CommunityMembersInfiniteQuery = CommunityMembersQuery & {
  hasMore: boolean;
};

export const useInfiniteCommunityMembersQuery = (
  options?: Omit<CommunityMembersQueryOptions, "skip">,
): UseInfiniteQueryResult<
  InfiniteData<CommunityMembersInfiniteQuery, number>,
  Error
> => {
  const mergedOptions = mergeOptions(options);
  const queryFn = async ({
    pageParam = 0,
  }): Promise<CommunityMembersInfiniteQuery> => {
    const result = await fetchCommunityMembers({
      ...mergedOptions,
      pageSize: ROWS_PER_PAGE + 1, // Fetch one extra item to determine if there's a next page
      skip: pageParam * ROWS_PER_PAGE,
    });

    // Slice off the sentinel row so consumers always get at most ROWS_PER_PAGE items
    return {
      ...result,
      communityMemberships: result.communityMemberships.slice(0, ROWS_PER_PAGE),
      hasMore: result.communityMemberships.length > ROWS_PER_PAGE,
    };
  };

  return useInfiniteQuery({
    queryKey: ["communityMembersInfinite", mergedOptions],
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages) => {
      return lastPage.hasMore ? _allPages.length : undefined;
    },
    enabled: !!options?.communityId,
    placeholderData: (prev) => prev,
    gcTime: TEN_MINUTES_IN_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
