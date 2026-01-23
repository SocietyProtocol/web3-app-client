import { Address } from "viem";
import {
  Badge_filter,
  BadgeDocument,
  BadgeQuery,
  BadgesDocument,
  BadgesQuery,
  execute,
  InputMaybe,
} from "../../../.graphclient";
import { defaultOptions } from "./consts";
import { BadgeQueryOptions, FullBadgeData } from "./types";
import { isEqualCaseInsensitive } from "@/utils/string";

/**
 * Merges the provided options with the default options.
 *
 * @param options Options to merge
 * @returns Merged options
 */
export const mergeOptions = (
  options?: BadgeQueryOptions,
): BadgeQueryOptions & {
  pageSize: number;
} => {
  const { searchText, creatorAddress, managerAddress, holderAddress } =
    options || {};
  return {
    ...defaultOptions,
    ...options,
    managerAddress: managerAddress?.trim().toLowerCase(),
    creatorAddress: creatorAddress?.trim().toLowerCase(),
    holderAddress: holderAddress?.trim().toLowerCase(),
    searchText: (searchText ?? defaultOptions.searchText)
      ?.trim()
      .replace(/\s+/g, " "),
  };
};

/**
 * Builds a where clause for querying badges based on the provided options.
 *
 * @param options Options to build the where clause from
 * @returns Where clause object
 */
export const buildWhereClause = (options: {
  searchText?: string | null;
  creatorAddress?: string | null;
  managerAddress?: string | null;
  holderAddress?: string | null;
}) => {
  const { searchText, creatorAddress, managerAddress, holderAddress } = options;

  const whereClauses: InputMaybe<InputMaybe<Badge_filter>[]> = [];

  if (creatorAddress) {
    whereClauses.push({
      creatorAddress_contains_nocase: creatorAddress,
    });
  }

  if (managerAddress) {
    whereClauses.push({
      managers_: {
        id: managerAddress,
      },
    });
  }

  if (holderAddress) {
    whereClauses.push({
      holders_: {
        id: holderAddress,
      },
    });
  }

  if (searchText && searchText.trim() !== "") {
    const trimmedSearch = searchText.trim();
    whereClauses.push({
      or: [
        { name_contains_nocase: trimmedSearch },
        { creatorAddress_contains_nocase: trimmedSearch },
      ],
    });
  }

  if (whereClauses.length === 0) {
    return undefined;
  }

  return { and: whereClauses };
};

/**
 * Fetches a badge by its ID.
 *
 * @param id Badge ID
 * @returns Badge data
 */
export const fetchBadge = async (id: string) => {
  const res = await execute(BadgeDocument, {
    id,
  });

  return res.data as BadgeQuery;
};

/**
 *
 * @param param0
 * @returns
 */
export const fetchBadges = async (options?: BadgeQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const where = buildWhereClause({
    searchText: mergedOptions.searchText,
    creatorAddress: mergedOptions.creatorAddress,
    managerAddress: mergedOptions.managerAddress,
    holderAddress: mergedOptions.holderAddress,
  });

  const res = await execute(BadgesDocument, {
    first: mergedOptions.pageSize,
    skip: 0,
    orderBy: mergedOptions.orderBy,
    orderDirection: mergedOptions.orderDirection,
    where,
  });

  return res.data as BadgesQuery;
};

export const getBadgePermissions = (
  badge: FullBadgeData,
  userAddress: Address,
) => {
  const permissions = {
    canMint: false,
    canBurn: false,
    canTransfer: false,
  };

  for (const minter of badge.minters) {
    for (const holder of minter.holders) {
      if (isEqualCaseInsensitive(holder.id, userAddress)) {
        permissions.canMint = true;
        break;
      }
    }
  }

  for (const burner of badge.burners) {
    for (const holder of burner.holders) {
      if (isEqualCaseInsensitive(holder.id, userAddress)) {
        permissions.canBurn = true;
        break;
      }
    }
  }

  for (const transferer of badge.transferers) {
    for (const holder of transferer.holders) {
      if (isEqualCaseInsensitive(holder.id, userAddress)) {
        permissions.canTransfer = true;
        break;
      }
    }
  }

  return permissions;
};
