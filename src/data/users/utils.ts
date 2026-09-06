import {
  execute,
  InputMaybe,
  User_filter,
  UsersDocument,
  UsersQuery,
} from "../../../.graphclient";
import { requireGraphData } from "@/lib/graph-response";
import { AccountSortOption } from "../accounts/types";
import { defaultOptions } from "./consts";
import { UserQueryOptions } from "./types";

/**
 * Merges the provided options with the default options.
 *
 * @param options Options to merge
 * @returns Merged options
 */
export const mergeOptions = (
  options?: UserQueryOptions,
): Omit<UserQueryOptions, "orderBy"> & {
  pageSize: number;
  orderBy: AccountSortOption;
  orderDirection: "asc" | "desc";
} => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { searchText, onSuccess, ...rest } = options || {};
  const orderBy = options?.orderBy ?? defaultOptions.orderBy;

  return {
    ...defaultOptions,
    ...rest,
    searchText: (searchText ?? defaultOptions.searchText)
      ?.toLowerCase()
      .trim()
      .replace(/\s+/g, " "),
    orderBy,
    orderDirection: orderBy === AccountSortOption.Name ? "asc" : "desc",
    skip: options?.skip ?? 0,
  };
};

/**
 * Builds a where clause for querying users based on the provided options.
 *
 * @param options Options to build the where clause from
 * @returns Where clause object
 */
export const buildWhereClause = (options: {
  searchText?: string | null;
  includeUnregistered?: boolean;
}) => {
  const { searchText, includeUnregistered } = options;

  const whereClauses: InputMaybe<InputMaybe<User_filter>[]> = [];

  if (searchText && searchText.trim() !== "") {
    const trimmedSearch = searchText.trim();
    whereClauses.push({
      or: [
        { name_contains_nocase: trimmedSearch },
        {
          id: trimmedSearch,
        },
      ],
    });
  }

  if (!includeUnregistered) {
    whereClauses.push({ profile_not: null });
  }

  return { and: whereClauses };
};

/**
 * Fetches users based on the provided query options.
 *
 * @param options Query options
 * @returns Users data
 */
export const fetchUsers = async (options?: UserQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const where = buildWhereClause({
    searchText: mergedOptions.searchText,
    includeUnregistered: mergedOptions.includeUnregistered,
  });

  const res = await execute(UsersDocument, {
    first: mergedOptions.pageSize,
    skip: mergedOptions.skip,
    orderBy: mergedOptions.orderBy,
    orderDirection: mergedOptions.orderDirection,
    where,
  });

  return requireGraphData(res.data as UsersQuery | undefined, "Users");
};
