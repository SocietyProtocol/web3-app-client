"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { useDebounceValue } from "../../hooks/useDebounceValue";
import {
  CommunitySortOption,
  CommunityTabOption,
  CommunityTier,
} from "./types";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useCommunitiesQuery } from "./useCommunitiesQuery";
import { mergeOptions } from "./utils";

export const useCommunities = () => {
  const { address: userAddress } = useAccount();

  const [activeTab, setActiveTab] = useQueryState<CommunityTabOption>(
    "tab",
    parseAsStringEnum([
      CommunityTabOption.All,
      CommunityTabOption.My,
    ]).withDefault(CommunityTabOption.All),
  );

  const [isManagedByUser, setIsManagedByUser] = useQueryState(
    "managed",
    parseAsBoolean.withDefault(false),
  );

  const [orderBy, setSortBy] = useQueryState<CommunitySortOption>(
    "orderBy",
    parseAsStringEnum([
      CommunitySortOption.Id,
      CommunitySortOption.MemberCount,
    ]).withDefault(CommunitySortOption.Id),
  );

  const [tiers, setTiers] = useQueryState<CommunityTier[]>(
    "tier",
    parseAsArrayOf(
      parseAsStringEnum([
        CommunityTier.Gold,
        CommunityTier.Silver,
        CommunityTier.Bronze,
        CommunityTier.Unaffiliated,
      ]),
    ).withDefault([]),
  );

  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const options = useMemo(
    () =>
      mergeOptions({
        searchText: debouncedSearchQuery,
        orderBy: orderBy,
        orderDirection: orderBy === CommunitySortOption.Id ? "asc" : "desc",

        ...(activeTab === CommunityTabOption.My && isManagedByUser
          ? { managerAddress: userAddress }
          : activeTab === CommunityTabOption.My
            ? { memberAddress: userAddress }
            : {}),
        tiers,
      }),
    [
      activeTab,
      debouncedSearchQuery,
      orderBy,
      tiers,
      userAddress,
      isManagedByUser,
    ],
  );

  const query = useCommunitiesQuery(options);

  return {
    ...query,
    options,
    activeTab,
    searchQuery,
    orderBy,
    setActiveTab,
    setSortBy,
    setSearchQuery,
    tiers,
    setTiers,
    isManagedByUser,
    setIsManagedByUser,
    userAddress,
  };
};
