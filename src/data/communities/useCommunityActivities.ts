import { useInfiniteQuery } from "@tanstack/react-query";
import {
  execute,
  CommunityActivitiesDocument,
  CommunityActivitiesQuery,
} from "../../../.graphclient";
import { requireGraphData } from "@/lib/graph-response";

const DEFAULT_PAGE_SIZE = 7;

export const useCommunityActivities = (
  communityId: string,
  pageSize = DEFAULT_PAGE_SIZE,
) => {
  return useInfiniteQuery({
    queryKey: ["communityActivities", communityId, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await execute(CommunityActivitiesDocument, {
        communityId,
        first: pageSize,
        skip: pageParam * pageSize,
      });
      return requireGraphData(
        res.data as CommunityActivitiesQuery | undefined,
        "CommunityActivities",
      );
    },
    getNextPageParam: (lastPage, pages) => {
      const count = lastPage?.communityActivityEvents?.length ?? 0;
      if (count < pageSize) return undefined;
      return pages.length;
    },
    enabled: !!communityId,
  });
};
