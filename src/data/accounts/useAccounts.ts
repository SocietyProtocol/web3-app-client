import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { useDebounceValue } from "../../hooks/useDebounceValue";
import { SortOption } from "./types";
import { useMemo } from "react";
import { useUsersQuery } from "../users/useUsersQuery";
import { mergeOptions } from "../users/utils";

export const useAccounts = () => {
  const [orderBy, setSortBy] = useQueryState<SortOption>(
    "orderBy",
    parseAsStringEnum([SortOption.Newest, SortOption.Name]).withDefault(
      SortOption.Newest,
    ),
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
        orderDirection: orderBy === SortOption.Name ? "asc" : "desc",
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
