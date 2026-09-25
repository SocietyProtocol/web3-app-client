import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { useDebounceValue } from "../../hooks/useDebounceValue";
import { AccountRole, AccountSortOption } from "./types";
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

  const [roles, setRoles] = useQueryState<AccountRole[]>(
    "roles",
    parseAsArrayOf(
      parseAsStringEnum([
        AccountRole.Governors,
        AccountRole.Contributors,
        AccountRole.CoreTeam,
        AccountRole.Advisors,
        AccountRole.Moderators,
        AccountRole.Basic,
      ]),
    ).withDefault([]),
  );

  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const options = useMemo(
    () =>
      mergeOptions({
        searchText: debouncedSearchQuery,
        orderBy,
        orderDirection: orderBy === AccountSortOption.Name ? "asc" : "desc",
        roles,
      }),
    [debouncedSearchQuery, orderBy, roles],
  );

  const query = useUsersQuery(options);

  return {
    ...query,
    options,
    searchQuery,
    orderBy,
    roles,
    setSortBy,
    setSearchQuery,
    setRoles,
  };
};
