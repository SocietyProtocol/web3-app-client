"use client";

import { useBadges } from "@/hooks/useBadges";
import { BadgeCard } from "../BadgeCard/BadgeCard";
import { useMemo, useState, useEffect, useRef } from "react";
import { useLoadingBar } from "react-top-loading-bar";
import {
  Stack,
  TextField,
  Box,
  InputAdornment,
  Tabs,
  Tab,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import {
  FilterSelect,
  type FilterSelectOption,
} from "../FilterSelect/FilterSelect";
import { isEqualCaseInsensitive } from "@/utils/string";
import { useDebounceValue } from "@/hooks/useDebounceValue";

enum SortOption {
  Newest = "newest",
  Holders = "holders",
  Name = "name",
}
enum FilterOption {
  Anyone = "anyone",
  Me = "me",
  Address = "address",
}
enum TabOption {
  All = "all",
  Managed = "managed",
  MyBadges = "my-badges",
}

const sortOptions: FilterSelectOption<SortOption>[] = [
  { value: SortOption.Newest, label: "Newest" },
  { value: SortOption.Holders, label: "Holders" },
  { value: SortOption.Name, label: "Name" },
];

const filterOptions: FilterSelectOption<FilterOption>[] = [
  { value: FilterOption.Anyone, label: "Anyone" },
  { value: FilterOption.Address, label: "Address" },
];

export const Badges = () => {
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.All);
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.Newest);
  const [filterBy, setFilterBy] = useState<FilterOption>(FilterOption.Anyone);
  const [filterAddress, setFilterAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);
  const {
    data,
    isFetching,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBadges(debouncedSearchQuery);

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

  const tabCounts = useMemo(() => {
    const managed = userAddress
      ? allBadges.filter((badge) =>
          isEqualCaseInsensitive(badge.creatorAddress, userAddress),
        ).length
      : 0;
    const myBadges = userAddress
      ? allBadges.filter((badge) =>
          badge.holders?.some((holder) =>
            isEqualCaseInsensitive(holder.id, userAddress),
          ),
        ).length
      : 0;
    return {
      all: allBadges.length,
      managed,
      myBadges,
    };
  }, [allBadges, userAddress]);

  const filteredAndSortedBadges = useMemo(() => {
    let result = [...allBadges];

    // Apply tab filter
    if (activeTab === "managed" && userAddress) {
      result = result.filter((badge) =>
        isEqualCaseInsensitive(badge.creatorAddress, userAddress),
      );
    } else if (activeTab === "my-badges" && userAddress) {
      result = result.filter((badge) =>
        badge.holders?.some((holder) =>
          isEqualCaseInsensitive(holder.id, userAddress),
        ),
      );
    }

    // Apply filter by creator
    if (filterBy === "me" && userAddress) {
      result = result.filter((badge) =>
        isEqualCaseInsensitive(badge.creatorAddress, userAddress),
      );
    } else if (filterBy === "address" && filterAddress) {
      const cleanAddress = filterAddress.trim();
      if (isAddress(cleanAddress)) {
        result = result.filter((badge) =>
          isEqualCaseInsensitive(badge.creatorAddress, cleanAddress),
        );
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        case "holders":
          return (b.holders?.length || 0) - (a.holders?.length || 0);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        default:
          return 0;
      }
    });

    return result;
  }, [allBadges, activeTab, sortBy, filterBy, filterAddress, userAddress]);

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
          <Tab label={`All (${tabCounts.all})`} value="all" />
          <Tab
            label={`Managed by me (${tabCounts.managed})`}
            value="managed"
            disabled={!userAddress}
          />
          <Tab
            label={`My badges (${tabCounts.myBadges})`}
            value="my-badges"
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
            alignItems: { xs: "stretch", md: "flex-start" },
          }}
        >
          <Stack direction="row" spacing={2}>
            {/* Sort */}
            <FilterSelect
              label="Sort by"
              value={sortBy}
              options={sortOptions}
              onChange={setSortBy}
            />

            {/* Filter */}
            <FilterSelect
              label="Created by"
              value={filterBy}
              options={filterOptions}
              onChange={(value) => {
                setFilterBy(value);
                if (value !== "address") {
                  setFilterAddress("");
                }
              }}
              customOption={FilterOption.Address}
              customInputValue={filterAddress}
              onCustomInputChange={setFilterAddress}
              customInputPlaceholder="0x..."
              customInputValidate={isAddress}
              customInputErrorText="Invalid address"
            />
          </Stack>

          {/* Search */}
          <TextField
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
        </Box>

        {/* Badge Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
              xl: "repeat(6, 1fr)",
            },
            gap: 2,
            width: "100%",
          }}
        >
          {isLoading ? (
            Array.from({ length: 12 }).map((_, index) => (
              <BadgeCard key={`skeleton-${index}`} loading />
            ))
          ) : filteredAndSortedBadges.length === 0 ? (
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
            filteredAndSortedBadges.map((badge) => (
              <BadgeCard key={badge.id} {...badge} />
            ))
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
