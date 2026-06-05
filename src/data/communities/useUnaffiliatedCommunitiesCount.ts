import { useQuery } from "@tanstack/react-query";
import { fetchCommunities } from "./utils";
import { CommunityTier } from "./types";
import { TEN_MINUTES_IN_MS } from "@/consts/time";

const MAX_COUNT_PROBE = 100;

/**
 * Counts how many communities currently fall in the Unaffiliated tier.
 * Used by the Communities listing to surface a "no results, but there
 * are X unaffiliated ones" hint when the active tier filter excludes
 * them and the main query comes back empty.
 *
 * The query caps at MAX_COUNT_PROBE to avoid pulling the whole catalog;
 * the page shows "100+" beyond that threshold.
 */
export const useUnaffiliatedCommunitiesCount = (enabled: boolean) => {
  return useQuery({
    queryKey: ["communities", "unaffiliated-count"],
    queryFn: async () => {
      const result = await fetchCommunities({
        tiers: [CommunityTier.Unaffiliated],
        pageSize: MAX_COUNT_PROBE,
        skip: 0,
      });
      return result?.communities?.length ?? 0;
    },
    enabled,
    gcTime: TEN_MINUTES_IN_MS,
    staleTime: TEN_MINUTES_IN_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const UNAFFILIATED_COUNT_CAP = MAX_COUNT_PROBE;
