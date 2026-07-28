import { uniq } from "@/utils/collection";
import {
  CommunitiesDocument,
  CommunitiesQuery,
  CommunityDocument,
  CommunityQuery,
  Community_filter,
  execute,
  InputMaybe,
} from "../../../.graphclient";
import { defaultOptions } from "./consts";
import { CommunityQueryOptions, CommunityTier } from "./types";

export type CommunityItem = CommunitiesQuery["communities"][number];

export const getTierExpirationDates = (communities: CommunityItem[]) => {
  return uniq(communities.map((community) => community.tierExpiresAt))
    .map((date) => Number(date))
    .filter((t) => t > 0);
};

/**
 * Sorts communities by their tier, placing non-expired tiers first and then sorting by tier ID in descending order.
 *
 * @param communities The list of communities to sort
 * @param now The current timestamp in seconds used to determine if a tier has expired
 * @returns The sorted list of communities
 */
export const sortCommunitiesByTier = (
  communities: CommunityItem[],
  now: number,
): CommunityItem[] => {
  const nowTimestamp = Math.floor(now);

  return [...communities].sort((a, b) => {
    const aExpired = Number(a.tierExpiresAt ?? 0) < nowTimestamp;
    const bExpired = Number(b.tierExpiresAt ?? 0) < nowTimestamp;
    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    return Number(b.tierId ?? 0) - Number(a.tierId ?? 0);
  });
};

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
  now?: number;
}) => {
  const { searchText, managerAddress, tiers, memberAddress, now } = options;

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
    const unaffiliatedIncluded = tiers.includes(CommunityTier.Unaffiliated);
    const unexpiredCondition = {
      tierName_in: tiers,
      tierExpiresAt_gt: now ? Math.floor(now) : undefined,
    };

    if (unaffiliatedIncluded) {
      const unaffiliatedCondition = {
        or: [
          {
            tierName: "unaffiliated",
          },
          {
            tierExpiresAt_lt: now ? Math.floor(now) : undefined,
          },
          {
            tierExpiresAt: null,
          },
        ],
      };

      whereClauses.push({
        or: [unexpiredCondition, unaffiliatedCondition],
      });
    } else {
      whereClauses.push(unexpiredCondition);
    }
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
    now: Math.floor(Date.now() / 1000),
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

/**
 * Fetches a single community by its ID.
 *
 * @param id Community ID
 * @returns Community data or null if not found
 */
export const fetchCommunity = async (id: string): Promise<CommunityQuery> => {
  const res = await execute(CommunityDocument, { id });
  return res.data as CommunityQuery;
};
