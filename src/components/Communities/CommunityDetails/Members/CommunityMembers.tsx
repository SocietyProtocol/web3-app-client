"use client";

import {
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { CommunityMemberRow } from "./CommunityMemberRow";
import { CommunityMembersHeader } from "./CommunityMembersHeader";
import { CommunityMembersPagination } from "./CommunityMembersPagination";
import { Tr } from "./Tr";
import { useCommunityDetailsContext } from "../CommunityDetails.context";
import { useCommunityMembers } from "@/data/community-members/useCommunityMembers";
import { FilterSelect } from "@/components/FilterSelect/FilterSelect";
import { communityMemberSortOptions } from "@/data/community-members/consts";
import { useMemo } from "react";
import { SearchBox } from "@/components/Common/SearchBox";

export function CommunityMembers() {
  const { id, isManager, community } = useCommunityDetailsContext();

  const {
    pageQuery,
    searchQuery,
    isSearching,
    page,
    totalPages,
    search,
    orderBy: sort,
    setPage,
    setSearch,
    setSort,
    hasNextPage,
    loadMore,
  } = useCommunityMembers(
    id,
    community?.memberCount ? Number(community?.memberCount) : undefined,
  );

  const membersToDisplay = useMemo(() => {
    if (isSearching) {
      return (searchQuery.data?.pages ?? []).flatMap(
        (p) => p.memberJoinedActivities ?? [],
      );
    }
    return pageQuery.data?.memberJoinedActivities ?? [];
  }, [isSearching, searchQuery.data, pageQuery.data]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleSort = (value: string) => {
    setSort(value as typeof sort);
  };

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        <SearchBox
          id="members-search-input"
          placeholder="Search by name or address..."
          value={search}
          onChange={handleSearch}
          sx={{
            flex: { xs: 1, md: "unset" },
            minWidth: { xs: "100%", md: 300 },
          }}
        />
        <FilterSelect
          label="Sort by"
          value={sort}
          options={communityMemberSortOptions}
          onChange={handleSort}
        />
      </Box>

      <Box
        role="table"
        aria-label="Community members"
        sx={{ borderRadius: 2, overflow: "hidden" }}
      >
        <CommunityMembersHeader isManager={isManager} />

        {(pageQuery.isLoading || searchQuery.isLoading) &&
          Array.from({ length: 6 }).map((_, index) => (
            <Tr key={`member-skeleton-${index}`} isManager={isManager}>
              <Skeleton width={120} height={20} />
              <Skeleton width={90} height={20} />
              {isManager && (
                <Stack alignItems="flex-end">
                  <Skeleton width={64} height={20} />
                </Stack>
              )}
            </Tr>
          ))}

        {isSearching &&
          !searchQuery.isLoading &&
          searchQuery.data?.pages[0]?.memberJoinedActivities?.length === 0 && (
            <Stack justifyContent="center" alignItems="center" minHeight={180}>
              <Typography color="text.secondary" variant="body2">
                No members match your search.
              </Typography>
            </Stack>
          )}

        {!isSearching &&
          !pageQuery.isLoading &&
          pageQuery.data?.memberJoinedActivities?.length === 0 && (
            <Stack justifyContent="center" alignItems="center" minHeight={180}>
              <Typography color="text.secondary" variant="body2">
                No members found.
              </Typography>
            </Stack>
          )}

        {!pageQuery.isLoading &&
          !searchQuery.isLoading &&
          membersToDisplay.map((member) => (
            <CommunityMemberRow
              key={member.id}
              member={member}
              isManager={isManager}
              memberBadgeId={community?.memberBadge?.id}
            />
          ))}
      </Box>

      {isSearching ? (
        <>
          {searchQuery.isFetching && membersToDisplay.length > 0 && (
            <Stack alignItems="center" py={1}>
              <CircularProgress size={20} />
            </Stack>
          )}
          {hasNextPage && !searchQuery.isFetching && (
            <Stack alignItems="center" py={2}>
              <Button variant="text" size="small" onClick={() => loadMore()}>
                Load more
              </Button>
            </Stack>
          )}
        </>
      ) : (
        (totalPages > 1 || page > 1) &&
        !pageQuery.isLoading && (
          <CommunityMembersPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )
      )}
    </Stack>
  );
}
