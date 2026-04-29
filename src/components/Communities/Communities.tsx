"use client";

import { CommunityCard } from "./CommunityCard";
import { useEffect, useMemo, useRef } from "react";
import { useLoadingBar } from "react-top-loading-bar";
import {
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FilterSelect } from "../FilterSelect/FilterSelect";
import {
  CommunityTabOption,
  CommunityTier,
} from "../../data/communities/types";
import { useCommunities } from "@/data/communities/useCommunities";
import { communitySortOptions } from "../../data/communities/consts";
import { ErrorDisplay } from "../ErrorBoundary/ErrorDisplay";
import { useAccount } from "wagmi";
import { CommunityTierFilter } from "./CommunityTierFilter";

export const Communities = () => {
  const { address: userAddress } = useAccount();
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
    activeTab,
    searchQuery,
    orderBy,
    setSearchQuery,
    setActiveTab,
    setSortBy,
    tiers,
    setTiers,
    isManagedByUser,
    setIsManagedByUser,
  } = useCommunities();

  const allCommunities = useMemo(
    () => data?.pages.flatMap((page) => page.communities) || [],
    [data],
  );

  const { start, complete } = useLoadingBar();

  useEffect(() => {
    if (isFetching) {
      start("continuous");
    } else {
      complete();
    }
  }, [complete, isFetching, start]);

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
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <Stack spacing={3} width="100%" marginTop={3}>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="All Communities" value={CommunityTabOption.All} />
          <Tab
            label="My Communities"
            value={CommunityTabOption.My}
            disabled={!userAddress}
          />
        </Tabs>

        {/* Controls */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
          }}
        >
          {/* Search */}
          <TextField
            id="communities-search-input"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              flex: { xs: 1, md: "unset" },
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

          <CommunityTierFilter value={tiers} onChange={setTiers} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FilterSelect
              label="Sort by"
              value={orderBy}
              options={communitySortOptions}
              onChange={setSortBy}
            />
          </Stack>
        </Box>

        {/* My Communities extra filters */}
        {activeTab === CommunityTabOption.My && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isManagedByUser}
                  onChange={(e) => setIsManagedByUser(e.target.checked)}
                />
              }
              sx={{
                marginLeft: 0,
              }}
              label="Only communities that I manage"
            />
          </Box>
        )}

        {/* Community Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
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
              <CommunityCard key={`skeleton-${index}`} loading />
            ))
          ) : allCommunities?.length === 0 ? (
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
                No communities found
              </Typography>
            </Box>
          ) : (
            allCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                {...community}
                tierName={community.tierName as CommunityTier}
              />
            ))
          )}
        </Box>

        {/* Intersection observer target */}
        <Box ref={observerTarget} sx={{ height: 20, width: "100%" }} />

        {isFetchingNextPage && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Loading more communities...
            </Typography>
          </Box>
        )}
      </Stack>
    </>
  );
};
