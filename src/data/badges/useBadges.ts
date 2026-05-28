import { useAccount } from "wagmi";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from "nuqs";
import { addressParser } from "@/lib/nuqs";
import { useDebounceValue } from "../../hooks/useDebounceValue";
import {
  CreatedByOption,
  BadgeCategory,
  BadgeSortOption,
  TabOption,
} from "@/data/badges/types";
import { mergeOptions } from "./utils";
import { useBadgesQuery } from "./useBadgesQuery";
import { useMemo } from "react";

export const useBadges = () => {
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useQueryState<TabOption>(
    "tab",
    parseAsStringEnum([
      TabOption.All,
      TabOption.Managed,
      TabOption.MyBadges,
    ]).withDefault(TabOption.All),
  );

  const [orderBy, setSortBy] = useQueryState<BadgeSortOption>(
    "orderBy",
    parseAsStringEnum([
      BadgeSortOption.Newest,
      BadgeSortOption.Holders,
      BadgeSortOption.Name,
      BadgeSortOption.Id,
    ]).withDefault(BadgeSortOption.Newest),
  );

  const [createdBy, setCreatedBy] = useQueryState<CreatedByOption>(
    "createdBy",
    parseAsStringEnum([
      CreatedByOption.Anyone,
      CreatedByOption.Me,
      CreatedByOption.Address,
    ]).withDefault(CreatedByOption.Anyone),
  );
  const [createdByAddress, setCreatedByAddress] = useQueryState(
    "createdByAddress",
    addressParser,
  );

  const [categories, setCategories] = useQueryState<BadgeCategory[]>(
    "category",
    parseAsArrayOf(
      parseAsStringEnum([
        BadgeCategory.Official,
        BadgeCategory.Community,
        BadgeCategory.Individual,
        BadgeCategory.NonOfficial,
      ]),
    ).withDefault([
      BadgeCategory.Official,
      BadgeCategory.Community,
      BadgeCategory.Individual,
    ]),
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
        creatorAddress:
          createdBy === CreatedByOption.Address
            ? createdByAddress
            : createdBy === CreatedByOption.Me
              ? userAddress
              : undefined,
        managerAddress:
          activeTab === TabOption.Managed ? userAddress : undefined,
        holderAddress:
          activeTab === TabOption.MyBadges ? userAddress : undefined,
        orderBy: orderBy,
        orderDirection: orderBy === BadgeSortOption.Name ? "asc" : "desc",
        categories,
      }),
    [
      debouncedSearchQuery,
      createdBy,
      createdByAddress,
      userAddress,
      activeTab,
      orderBy,
      categories,
    ],
  );

  const query = useBadgesQuery(options);

  return {
    ...query,
    options,
    activeTab,
    createdBy,
    createdByAddress,
    searchQuery,
    orderBy,
    categories,
    setActiveTab,
    setSortBy,
    setCreatedBy,
    setCreatedByAddress,
    setSearchQuery,
    setCategories,
  };
};
