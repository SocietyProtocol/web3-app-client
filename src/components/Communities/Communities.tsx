"use client";

import { CommunityCard } from "./CommunityCard";
import { useEffect, useMemo, useRef } from "react";
import { useLoadingBar } from "react-top-loading-bar";
import {
  Box,
  Button,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { FilterSelect } from "../FilterSelect/FilterSelect";
import {
  CommunitySortOption,
  CommunityTabOption,
  CommunityTier,
} from "../../data/communities/types";
import { useCommunities } from "@/data/communities/useCommunities";
import {
  UNAFFILIATED_COUNT_CAP,
  useUnaffiliatedCommunitiesCount,
} from "@/data/communities/useUnaffiliatedCommunitiesCount";
import { communitySortOptions } from "../../data/communities/consts";
import {
  getTierExpirationDates,
  sortCommunitiesByTier,
} from "../../data/communities/utils";
import { ErrorDisplay } from "../ErrorBoundary/ErrorDisplay";
import { useAccount } from "wagmi";
import { CommunityTierFilter } from "./Tier/CommunityTierFilter";
import { useNow } from "@/hooks/useNow";
import { SearchBox } from "@/components/Common/SearchBox";
import { ButtonLink } from "../ButtonLink";

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

  const flatData = useMemo(
    () => data?.pages.flatMap((page) => page.communities) || [],
    [data],
  );

  const expirationDates = useMemo(
    () => getTierExpirationDates(flatData),
    [flatData],
  );

  const now = useNow({
    updateAt: expirationDates,
  });

  const allCommunities = useMemo(() => {
    if (orderBy !== CommunitySortOption.Tier) return flatData;
    return sortCommunitiesByTier(flatData, now);
  }, [flatData, now, orderBy]);

  const { start, complete } = useLoadingBar();

  useEffect(() => {
    if (isFetching) {
      start("continuous");
    } else {
      complete();
    }
  }, [complete, isFetching, start]);

  // When the main query comes back empty and the active filter does not
  // include the Unaffiliated tier, hint that there are unaffiliated
  // communities the user can opt-in to see.
  const unaffiliatedExcluded =
    !!tiers && tiers.length > 0 && !tiers.includes(CommunityTier.Unaffiliated);
  const showUnaffiliatedHint =
    !isLoading && allCommunities.length === 0 && unaffiliatedExcluded;
  const unaffiliatedCountQuery =
    useUnaffiliatedCommunitiesCount(showUnaffiliatedHint);
  const unaffiliatedCount = unaffiliatedCountQuery.data ?? 0;

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
      <Stack spacing={3} width="100%">
        {/* Header + Create Community button */}
        <Box
          sx={{
            pt: { xs: 4, md: 0 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            color="primary.main"
            sx={{
              mb: { xs: 1, sm: 0 },
              textAlign: { xs: "left", sm: "inherit" },
            }}
          >
            Communities
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 4 }}>
            <Link
              href="/communities-faq"
              style={{
                textDecoration: "underline",
                fontSize: "1rem",
              }}
            >
              Learn more about communities
            </Link>
            <ButtonLink
              variant="contained"
              sx={{
                width: { xs: "100%", sm: "auto !important" },
                maxWidth: { xs: "100% !important", sm: "220px !important" },
                whiteSpace: "nowrap",
                minWidth: "200px !important",
                flex: 1,
              }}
              href="/create-community"
            >
              Create Community
            </ButtonLink>
          </Box>
        </Box>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            // Responsive: scrollable on xs/sm, fullWidth on md+
            ".MuiTabs-flexContainer": {
              justifyContent: { xs: "flex-start", md: "center" },
            },
            "& .MuiTab-root": {
              flex: { xs: "0 0 auto", md: "1 1 0%" },
              minWidth: { xs: 120, md: 0 },
            },
            "& .MuiTabs-indicator": {
              left: { xs: 0, md: undefined },
              right: { xs: 0, md: undefined },
              width: { xs: "100%", md: undefined },
            },
          }}
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
            flexDirection: { xs: "column", xl: "row" },
            gap: 2,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", xl: "row" },
              gap: 2,
              flex: 1,
              alignItems: "center",
            }}
          >
            {/* Search */}
            <SearchBox
              id="communities-search-input"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={setSearchQuery}
              sx={{
                flex: { xs: 1, md: "unset" },
                minWidth: { xs: "100%", xl: 300 },
              }}
            />
            <CommunityTierFilter value={tiers} onChange={setTiers} />
          </Box>

          <Box sx={{ minWidth: { xs: "100%", sm: 180 }, mt: { xs: 2, xl: 0 } }}>
            <FilterSelect
              label="Sort by"
              value={orderBy}
              options={communitySortOptions}
              onChange={setSortBy}
            />
          </Box>
        </Box>

        {/* My Communities extra filters */}
        {activeTab === CommunityTabOption.My && (
          <Box
            sx={{
              display: "flex",
              justifyContent: {
                xs: "center",
                xl: "flex-start",
              },
            }}
          >
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
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 1.5,
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.primary">
                No communities found
              </Typography>
              {showUnaffiliatedHint && unaffiliatedCount > 0 && (
                <>
                  <Typography
                    variant="body2"
                    color="text.tertiary"
                    sx={{ textAlign: "center" }}
                  >
                    We have{" "}
                    {unaffiliatedCount >= UNAFFILIATED_COUNT_CAP
                      ? `${UNAFFILIATED_COUNT_CAP}+`
                      : unaffiliatedCount}{" "}
                    unaffiliated{" "}
                    {unaffiliatedCount === 1 ? "community" : "communities"}.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      setTiers([
                        ...(tiers ?? []),
                        CommunityTier.Unaffiliated,
                      ])
                    }
                  >
                    Show unaffiliated
                  </Button>
                </>
              )}
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
