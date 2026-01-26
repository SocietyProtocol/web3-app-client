import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, mergeOptions } from "./utils";
import { UserQueryOptions } from "./types";

export const useUsersQuery = (options?: UserQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ["users", mergedOptions],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await fetchUsers({
        ...mergedOptions,
        skip: pageParam * mergedOptions.pageSize,
      });

      result.users.forEach((user) => {
        queryClient.setQueryData(["user", user.id], user);
      });

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
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
