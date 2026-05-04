import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, mergeOptions } from "./utils";
import { UserQueryOptions } from "./types";
import { TEN_MINUTES_IN_MS } from "@/consts/time";

export const useUsersQuery = (options?: UserQueryOptions) => {
  const { onSuccess, ...restOptions } = options || {};
  const mergedOptions = mergeOptions(restOptions);

  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["users", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const result = await fetchUsers({
        ...mergedOptions,
        skip: pageParam * mergedOptions.pageSize,
      });

      result.users.forEach((user) => {
        queryClient.setQueryData(["user", user.id.toLowerCase()], user);
      });

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
