import { Badge_filter, InputMaybe } from "../../../.graphclient";
import { defaultOptions } from "./consts";
import { BadgeQueryOptions } from "./types";

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
    searchText: searchText?.trim().replace(/\s+/g, " "),
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
