import { useQuery } from "@tanstack/react-query";
import {
  execute,
  CommunityActivitiesDocument,
  CommunityActivitiesQuery,
} from "../../../.graphclient";

const DEFAULT_FIRST = 20;

export const useCommunityActivities = (
  communityId: string,
  first = DEFAULT_FIRST,
) => {
  return useQuery({
    queryKey: ["communityActivities", communityId, first],
    queryFn: async () => {
      const res = await execute(CommunityActivitiesDocument, {
        communityId,
        first,
      });
      return res.data as CommunityActivitiesQuery;
    },
    enabled: !!communityId,
  });
};
