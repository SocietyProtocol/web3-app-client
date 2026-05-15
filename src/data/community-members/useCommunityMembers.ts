import { useState } from "react";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { CommunityMembersSortOption } from "./types";
import { useCommunityMembersQuery } from "./useCommunityMembersQuery";
import { useInfiniteCommunityMembersQuery } from "./useInfiniteCommunityMembersQuery";
import { ROWS_PER_PAGE } from "./consts";

export const useCommunityMembers = (
  communityId?: string,
  memberCount?: number,
) => {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<CommunityMembersSortOption>(
    CommunityMembersSortOption.Newest,
  );
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounceValue(search, 500);
  const isSearching = !!debouncedSearch.trim();

  // --- Normal pagination query (used when not searching) ---
  const pageQuery = useCommunityMembersQuery(
    communityId && !isSearching
      ? {
          communityId,
          searchText: "",
          orderBy,
          pageSize: ROWS_PER_PAGE,
          skip: (page - 1) * ROWS_PER_PAGE,
        }
      : undefined,
  );

  // --- Infinite query (used when searching) ---
  const searchQuery = useInfiniteCommunityMembersQuery(
    communityId && isSearching
      ? { communityId, searchText: debouncedSearch, orderBy }
      : undefined,
  );

  const hasNextPage = isSearching
    ? searchQuery.hasNextPage
    : page * ROWS_PER_PAGE < (memberCount ?? 0);

  const totalPages = isSearching
    ? 1
    : Math.max(1, Math.ceil((memberCount ?? 0) / ROWS_PER_PAGE));

  const handleSetSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSetSort = (value: CommunityMembersSortOption) => {
    setOrderBy(value);
    setPage(1);
  };

  return {
    pageQuery,
    searchQuery,
    isSearching,
    page,
    totalPages,
    hasNextPage,
    search,
    orderBy,
    setPage,
    setSearch: handleSetSearch,
    setSort: handleSetSort,
    loadMore: searchQuery.fetchNextPage,
  };
};
