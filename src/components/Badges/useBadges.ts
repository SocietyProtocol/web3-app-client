import { useAccount } from "wagmi";
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { addressParser } from "@/lib/nuqs";
import { useDebounceValue } from "../../hooks/useDebounceValue";
import {
  CreatedByOption,
  SortOption,
  TabOption,
} from "@/components/Badges/types";
import { mergeOptions } from "./utils";
import { useBadgesQuery } from "./useBadgesQuery";

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

  const [orderBy, setSortBy] = useQueryState<SortOption>(
    "orderBy",
    parseAsStringEnum([
      SortOption.Newest,
      SortOption.Holders,
      SortOption.Name,
      SortOption.Id,
    ]).withDefault(SortOption.Newest),
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

  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const options = mergeOptions({
    searchText: debouncedSearchQuery,
    creatorAddress:
      createdBy === CreatedByOption.Address
        ? createdByAddress
        : createdBy === CreatedByOption.Me
          ? userAddress
          : undefined,
    managerAddress: activeTab === TabOption.Managed ? userAddress : undefined,
    holderAddress: activeTab === TabOption.MyBadges ? userAddress : undefined,
    orderBy: orderBy,
    orderDirection: orderBy === SortOption.Name ? "asc" : "desc",
  });

  const query = useBadgesQuery(options);

  return {
    ...query,
    options,
    activeTab,
    createdBy,
    createdByAddress,
    searchQuery,
    orderBy,
    setActiveTab,
    setSortBy,
    setCreatedBy,
    setCreatedByAddress,
    setSearchQuery,
  };
};
