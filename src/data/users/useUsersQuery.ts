import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMigratedLegacyAccounts, fetchUsers, mergeOptions } from "./utils";
import { appChainId } from "./legacyAccounts";
import { UserQueryOptions } from "./types";
import { TEN_MINUTES_IN_MS } from "@/consts/time";

export const useUsersQuery = (options?: UserQueryOptions) => {
  const { onSuccess, ...restOptions } = options || {};
  const mergedOptions = mergeOptions(restOptions);
  const queryClient = useQueryClient();
  const chainId = appChainId();

  return useInfiniteQuery({
    queryKey: ["users", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      // One lookup shared by every page and filter, cached like the users.
      const excludeIds = await queryClient.fetchQuery({
        queryKey: ["users", "migrated-legacy", chainId],
        queryFn: () => fetchMigratedLegacyAccounts(chainId),
        staleTime: TEN_MINUTES_IN_MS,
        gcTime: TEN_MINUTES_IN_MS,
      });
      const result = await fetchUsers(
        {
          ...mergedOptions,
          skip: pageParam * mergedOptions.pageSize,
        },
        excludeIds,
      );

      if (onSuccess) {
        try {
          onSuccess(result);
        } catch (error) {
          console.error("Error in onSuccess callback of useUsersQuery:", error);
        }
      }

      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (
        !lastPage?.users?.length ||
        lastPage.users.length < mergedOptions.pageSize
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
