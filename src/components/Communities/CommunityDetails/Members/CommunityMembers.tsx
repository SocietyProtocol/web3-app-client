"use client";

import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { CommunityMemberRow } from "./CommunityMemberRow";
import { CommunityMembersHeader } from "./CommunityMembersHeader";
import { CommunityMembersPagination } from "./CommunityMembersPagination";
import { Tr } from "./Tr";
import { useCommunityDetailsContext } from "../CommunityDetails.context";

const ROWS_PER_PAGE = 10;

export function CommunityMembers() {
  const { community, memberJoinedActivities, isLoading, isManager } =
    useCommunityDetailsContext();

  const [page, setPage] = useState(1);

  const joinedAtByUserId = useMemo(() => {
    return (
      memberJoinedActivities?.reduce<Record<string, string>>((acc, event) => {
        if (!event.user?.id) return acc;

        const existing = acc[event.user.id];
        if (!existing || Number(event.timestamp) > Number(existing)) {
          acc[event.user.id] = event.timestamp.toString();
        }

        return acc;
      }, {}) ?? {}
    );
  }, [memberJoinedActivities]);

  const sortedMembers = useMemo(
    () =>
      [...(community?.members ?? [])].sort(
        (a, b) =>
          Number(joinedAtByUserId[b.id] ?? 0) -
          Number(joinedAtByUserId[a.id] ?? 0),
      ),
    [joinedAtByUserId, community?.members],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedMembers.length / ROWS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);

  const currentMembers = useMemo(
    () =>
      sortedMembers.slice(
        (currentPage - 1) * ROWS_PER_PAGE,
        currentPage * ROWS_PER_PAGE,
      ),
    [currentPage, sortedMembers],
  );

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Box
        role="table"
        aria-label="Community members"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <CommunityMembersHeader isManager={isManager} />

        {isLoading &&
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

        {!isLoading && currentMembers.length === 0 && (
          <Stack justifyContent="center" alignItems="center" minHeight={180}>
            <Typography color="text.secondary" variant="body2">
              No members found.
            </Typography>
          </Stack>
        )}

        {!isLoading &&
          currentMembers.map((member) => (
            <CommunityMemberRow
              key={member.id}
              member={member}
              joinedAt={joinedAtByUserId[member.id]}
              isManager={isManager}
            />
          ))}
      </Box>

      {totalPages > 1 && !isLoading && (
        <CommunityMembersPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </Stack>
  );
}
