"use client";

import { BadgeCard } from "./BadgeCard";
import { useMemo, useEffect, useRef } from "react";
import { useLoadingBar } from "react-top-loading-bar";
import { Stack, Box, Tabs, Tab, Typography, Button } from "@mui/material";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { FilterSelect } from "../FilterSelect/FilterSelect";
import { CreatedByOption, TabOption } from "../../data/badges/types";
import { useBadges } from "@/data/badges/useBadges";
import { filterOptions, sortOptions } from "../../data/badges/consts";
import { ErrorDisplay } from "../ErrorBoundary/ErrorDisplay";
import { SearchBox } from "@/components/Common/SearchBox";

export const Badges = () => {
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
    createdBy,
    createdByAddress,
    orderBy,
    setSearchQuery,
    setActiveTab,
    setCreatedBy,
    setCreatedByAddress,
    setSortBy,
  } = useBadges();

  const { start, complete } = useLoadingBar();

  // Control loading bar for non-initial loads
  useEffect(() => {
    if (isFetching) {
      start("continuous");
    } else {
      complete();
    }
  }, [complete, isFetching, start]);

  const allBadges = useMemo(
    () => data?.pages.flatMap((page) => page.badges) || [],
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

  const onCreatedByAddressChange = (value: string) => {
    setCreatedByAddress(isAddress(value) ? value : null);
  };

  return (
    <>
      <Stack spacing={3} width="100%" marginTop={3}>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label="All" value={TabOption.All} />
          <Tab
            label="Managed by me"
            value={TabOption.Managed}
            disabled={!userAddress}
          />
          <Tab
            label="My badges"
            value={TabOption.MyBadges}
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
          <SearchBox
            id="badges-search-input"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={setSearchQuery}
            sx={{
              flex: {
                xs: 1,
                md: "unset",
              },
              minWidth: { xs: "100%", md: 300 },
            }}
          />
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={2}
          >
            {/* Sort */}
            <FilterSelect
              label="Sort by"
              value={orderBy}
              options={sortOptions}
              onChange={setSortBy}
            />

            {/* Filter */}
            <FilterSelect
              label="Created by"
              value={createdBy}
              options={filterOptions}
              onChange={(value) => {
                setCreatedBy(value);
                if (value !== CreatedByOption.Address) {
                  setCreatedByAddress(null);
                }
              }}
              customOption={CreatedByOption.Address}
              customInputValue={createdByAddress ?? undefined}
              onCustomInputChange={onCreatedByAddressChange}
              customInputPlaceholder="0x..."
            />
          </Stack>
        </Box>

        {/* Badge Grid */}
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
              <BadgeCard key={`skeleton-${index}`} loading />
            ))
          ) : allBadges.length === 0 ? (
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
                No badges found
              </Typography>
            </Box>
          ) : (
            allBadges.map((badge) => <BadgeCard key={badge.id} {...badge} />)
          )}
        </Box>

        {/* Intersection observer target for infinite scroll */}
        <Box ref={observerTarget} sx={{ height: 20, width: "100%" }} />

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Loading more badges...
            </Typography>
          </Box>
        )}
      </Stack>
    </>
  );
};
