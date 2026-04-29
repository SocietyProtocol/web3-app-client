import {
  CommunitiesDocument,
  CommunitiesQuery,
  Community_filter,
  execute,
  InputMaybe,
} from "../../../.graphclient";
import { defaultOptions } from "./consts";
import { CommunityQueryOptions, CommunityTier } from "./types";

/**
 * Merges the provided options with the default options.
 *
 * @param options Options to merge
 * @returns Merged options
 */
export const mergeOptions = (
  options?: CommunityQueryOptions,
): CommunityQueryOptions & {
  pageSize: number;
} => {
  const { searchText, managerAddress, memberAddress } = options || {};

  return {
    ...defaultOptions,
    ...options,
    managerAddress: managerAddress?.trim().toLowerCase(),
    memberAddress: memberAddress?.trim().toLowerCase(),
    searchText: (searchText ?? defaultOptions.searchText)
      ?.trim()
      .replace(/\s+/g, " "),
  };
};

/**
 * Builds a where clause for querying communities based on the provided options.
 *
 * @param options Options to build the where clause from
 * @returns Where clause object
 */
export const buildWhereClause = (options: {
  searchText?: string | null;
  managerAddress?: string | null;
  tiers?: CommunityTier[] | undefined;
  memberAddress?: string | null;
}) => {
  const { searchText, managerAddress, tiers, memberAddress } = options;

  const whereClauses: InputMaybe<InputMaybe<Community_filter>[]> = [];

  if (managerAddress) {
    whereClauses.push({
      manager_: {
        id: managerAddress,
      },
    });
  } else if (memberAddress) {
    whereClauses.push({
      members_: {
        id: memberAddress,
      },
    });
  }

  if (searchText && searchText.trim() !== "") {
    const trimmedSearch = searchText.trim();
    whereClauses.push({
      or: [{ name_contains_nocase: trimmedSearch }, { id: trimmedSearch }],
    });
  }

  if (
    tiers &&
    tiers.length > 0 &&
    tiers.length < Object.keys(CommunityTier).length
  ) {
    whereClauses.push({
      tierName_in: tiers,
    });
  }

  return { and: whereClauses };
};

/**
 * Fetches communities based on the provided query options.
 *
 * @param options Query options
 * @returns Communities data
 */
export const fetchCommunities = async (options?: CommunityQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const where = buildWhereClause({
    searchText: mergedOptions.searchText,
    managerAddress: mergedOptions.managerAddress,
    memberAddress: mergedOptions.memberAddress,
    tiers: mergedOptions.tiers,
  });

  const res = await execute(CommunitiesDocument, {
    first: mergedOptions.pageSize,
    skip: mergedOptions.skip,
    orderBy: mergedOptions.orderBy,
    orderDirection: mergedOptions.orderDirection,
    where,
  });

  return res.data as CommunitiesQuery;
};
