"use client";

import { useBadges } from "@/hooks/useBadges";
import { BadgeCard } from "../BadgeCard/BadgeCard";
import { useMemo, useState } from "react";
import { Gallery } from "../Gallery/Gallery";
import {
  Stack,
  TextField,
  Box,
  InputAdornment,
  Tabs,
  Tab,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import {
  FilterSelect,
  type FilterSelectOption,
} from "../FilterSelect/FilterSelect";
import { isEqualCaseInsensitive } from "@/utils/string";
import { searchInCollection } from "@/utils/collection";

type SortOption = "newest" | "holders" | "name";
type FilterOption = "anyone" | "me" | "address";
type TabOption = "all" | "managed" | "my-badges";

const gridConfig = {
  columns: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
  },
  rows: {
    xs: 2,
    sm: 3,
    md: 4,
    lg: 5,
  },
};

const sortOptions: FilterSelectOption<SortOption>[] = [
  { value: "newest", label: "Newest" },
  { value: "holders", label: "Holders" },
  { value: "name", label: "Name" },
];

const filterOptions: FilterSelectOption<FilterOption>[] = [
  { value: "anyone", label: "Anyone" },
  { value: "address", label: "Address" },
];

export const Badges = () => {
  const { data, isLoading } = useBadges();
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<TabOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("anyone");
  const [filterAddress, setFilterAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allBadges = useMemo(
    () => data?.pages.flatMap((page) => page.badges) || [],
    [data],
  );

  const tabCounts = useMemo(() => {
    const managed = userAddress
      ? allBadges.filter((badge) =>
          isEqualCaseInsensitive(badge.createdBy?.id, userAddress),
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
        isEqualCaseInsensitive(badge.createdBy?.id, userAddress),
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
        isEqualCaseInsensitive(badge.createdBy?.id, userAddress),
      );
    } else if (filterBy === "address" && filterAddress) {
      const cleanAddress = filterAddress.trim();
      if (isAddress(cleanAddress)) {
        result = result.filter((badge) =>
          isEqualCaseInsensitive(badge.createdBy?.id, cleanAddress),
        );
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      result = searchInCollection(result, searchQuery, [
        "name",
        "id",
        "createdBy.id",
      ]);
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
  }, [
    allBadges,
    activeTab,
    sortBy,
    filterBy,
    filterAddress,
    searchQuery,
    userAddress,
  ]);

  // Derive current page - reset to 1 if filters change
  const filterKey = `${activeTab}-${sortBy}-${filterBy}-${filterAddress}-${searchQuery}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  const [currentPage, setCurrentPage] = useState(1);

  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }

  return (
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
            customOption="address"
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

      {/* Gallery */}
      <Gallery
        items={filteredAndSortedBadges}
        loading={isLoading}
        emptyMessage="No badges found"
        renderItem={(badge) => <BadgeCard {...badge} />}
        renderSkeleton={() => <BadgeCard loading />}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        columns={gridConfig.columns}
        rows={gridConfig.rows}
      />
    </Stack>
  );
};
