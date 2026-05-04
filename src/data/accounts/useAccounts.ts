import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { useDebounceValue } from "../../hooks/useDebounceValue";
import { AccountSortOption } from "./types";
import { useMemo } from "react";
import { useUsersQuery } from "../users/useUsersQuery";
import { mergeOptions } from "../users/utils";

export const useAccounts = () => {
  const [orderBy, setSortBy] = useQueryState<AccountSortOption>(
    "orderBy",
    parseAsStringEnum([
      AccountSortOption.Newest,
      AccountSortOption.Name,
    ]).withDefault(AccountSortOption.Newest),
  );

  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const options = useMemo(
    () =>
      mergeOptions({
        searchText: debouncedSearchQuery,
        orderBy,
        orderDirection: orderBy === AccountSortOption.Name ? "asc" : "desc",
      }),
    [debouncedSearchQuery, orderBy],
  );

  const query = useUsersQuery(options);

  return {
    ...query,
    options,
    searchQuery,
    orderBy,
    setSortBy,
    setSearchQuery,
  };
};
