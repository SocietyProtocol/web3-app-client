import { Address, decodeEventLog, TransactionReceipt } from "viem";
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
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";

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
 * Fetches badges based on the provided query options.
 *
 * @param options Query options
 * @returns Badges data
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
    skip: mergedOptions.skip,
    orderBy: mergedOptions.orderBy,
    orderDirection: mergedOptions.orderDirection,
    where,
  });

  return res.data as BadgesQuery;
};

/**
 * Gets the badge permissions for a user.
 *
 * @param badge Badge data
 * @param userAddress User address
 * @returns Badge permissions { canMint: boolean, canBurn: boolean, canTransfer: boolean }
 *
 */
export const getBadgePermissions = (
  badge: FullBadgeData,
  userAddress: Address,
) => {
  const lowerCasedUserAddress = userAddress.toLowerCase();

  const mintersSet = new Set(
    badge.minters.flatMap((minter) =>
      minter.holders.map((holder) => holder.id.toLowerCase()),
    ),
  );

  const burnersSet = new Set(
    badge.burners.flatMap((burner) =>
      burner.holders.map((holder) => holder.id.toLowerCase()),
    ),
  );

  const transferersSet = new Set(
    badge.transferers.flatMap((transferer) =>
      transferer.holders.map((holder) => holder.id.toLowerCase()),
    ),
  );

  return {
    canMint: mintersSet.has(lowerCasedUserAddress),
    canBurn: burnersSet.has(lowerCasedUserAddress),
    canTransfer: transferersSet.has(lowerCasedUserAddress),
  };
};

/**
 * Decodes the created badge ID from a transaction receipt.
 *
 * @param receipt Transaction receipt
 * @returns Created badge ID or null if not found
 */
export const decodeBadgeId = (receipt: TransactionReceipt) => {
  let id: bigint | null = null;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: SocietyProtocolBadgesABI,
        data: log.data,
        topics: log.topics,
        eventName: "BadgeCreated",
      });

      id = decoded.args.id;
    } catch {
      // Ignore errors for logs that are not BadgeCreated events
    }
  }

  return id;
};
