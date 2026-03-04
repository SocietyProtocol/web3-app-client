"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import { useLoadingBar } from "react-top-loading-bar";
import {
  Stack,
  TextField,
  Box,
  InputAdornment,
  Typography,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FilterSelect } from "../FilterSelect/FilterSelect";
import { useAccounts } from "@/data/accounts/useAccounts";
import { sortOptions } from "../../data/accounts/consts";
import { ErrorDisplay } from "../ErrorBoundary/ErrorDisplay";
import { UserTag } from "../User/UserTag";
import { truncateAddress } from "@/utils/string";
import { Hex } from "viem";
import { useRouter } from "next/navigation";
import { useProfile } from "../AccountSetup/useProfile";

export const Accounts = () => {
  const router = useRouter();
  const profile = useProfile();

  const {
    data,
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    searchQuery,
    orderBy,
    setSearchQuery,
    setSortBy,
  } = useAccounts();

  const { start, complete } = useLoadingBar();

  // Control loading bar for non-initial loads
  useEffect(() => {
    if (isFetching) {
      start("continuous");
    } else {
      complete();
    }
  }, [complete, isFetching, start]);

  const allAccounts = useMemo(
    () => data?.pages.flatMap((page) => page.users) || [],
    [data],
  );

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSetupAccountClick = useCallback(() => {
    router.push("/profile?setupOpen=true");
  }, [router]);

  return (
    <>
      <Stack spacing={3} width="100%">
        {/* Controls */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              alignItems: { xs: "stretch", md: "center" },
            }}
          >
            {/* Search */}
            <TextField
              id="accounts-search-input"
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{
                flex: {
                  xs: 1,
                  md: "unset",
                },
                minWidth: { xs: "100%", md: 300 },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {/* Sort */}
            <FilterSelect
              label="Sort by"
              value={orderBy}
              options={sortOptions}
              onChange={setSortBy}
            />
          </Box>

          {!profile.subgraphData.isLoading && !profile.subgraphData.data && (
            <Button variant="contained" onClick={handleSetupAccountClick}>
              Setup Account
            </Button>
          )}
        </Box>

        {/* Accounts Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 2,
            width: "100%",
          }}
        >
          {isError ? (
            <ErrorDisplay
              error={error}
              action={
                <Button onClick={() => refetch()} variant="contained">
                  Retry
                </Button>
              }
            />
          ) : isLoading ? (
            Array.from({ length: 12 }).map((_, index) => (
              <UserTag key={`skeleton-${index}`} loading link />
            ))
          ) : allAccounts.length === 0 ? (
            <Box
              sx={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.primary">
                No accounts found
              </Typography>
            </Box>
          ) : (
            allAccounts.map((account) => (
              <Box
                key={account.id}
                sx={{
                  position: "relative",
                }}
              >
                <UserTag
                  id={account.id}
                  name={account.name ?? truncateAddress(account.id as Hex)}
                  bio={account.bio}
                  imageUrl={account.imageUrl}
                  link
                  highlightYou
                />
              </Box>
            ))
          )}
        </Box>

        {/* Intersection observer target for infinite scroll */}
        <Box ref={observerTarget} sx={{ height: 20, width: "100%" }} />

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Loading more accounts...
            </Typography>
          </Box>
        )}
      </Stack>
    </>
  );
};
