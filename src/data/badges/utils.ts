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
import { BadgeCategory, BadgeQueryOptions, FullBadgeData } from "./types";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { requireGraphData } from "@/lib/graph-response";

/**
 * Lower-cases one address or a list of them. A list of one collapses to
 * a string so query keys stay stable for members without a legacy wallet.
 */
export const normalizeAddresses = (
  value?: string | readonly string[] | null,
): string | string[] | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim().toLowerCase() || undefined;

  const list = Array.from(
    new Set(value.map((v) => v.trim().toLowerCase()).filter(Boolean)),
  );
  if (list.length === 0) return undefined;
  return list.length === 1 ? list[0] : list;
};

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
    managerAddress: normalizeAddresses(managerAddress),
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
  managerAddress?: string | readonly string[] | null;
  holderAddress?: string | null;
  includeProfile?: boolean;
  isCommunity?: boolean;
  categories?: BadgeCategory[];
}) => {
  const {
    searchText,
    creatorAddress,
    managerAddress,
    holderAddress,
    includeProfile,
    isCommunity,
    categories,
  } = options;

  const whereClauses: InputMaybe<InputMaybe<Badge_filter>[]> = [];

  if (creatorAddress) {
    whereClauses.push({
      creatorAddress_contains_nocase: creatorAddress,
    });
  }

  const managerAddresses = normalizeAddresses(managerAddress);
  if (typeof managerAddresses === "string") {
    whereClauses.push({
      managers_: {
        id: managerAddresses,
      },
    });
  } else if (managerAddresses) {
    whereClauses.push({
      managers_: {
        id_in: managerAddresses,
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
        { id: trimmedSearch },
        ...(includeProfile
          ? [{ profileUser_: { name_contains_nocase: trimmedSearch } }]
          : []),
      ],
    });
  }

  if (!includeProfile) {
    whereClauses.push({ isProfile: false });
  }

  if (isCommunity !== undefined) {
    whereClauses.push({ isCommunity });
  }

  if (categories && categories.length === 0) {
    whereClauses.push({ id: "0x" });
  }

  if (categories && categories.length > 0) {
    const showOfficial = categories.includes(BadgeCategory.Official);
    const showCommunity = categories.includes(BadgeCategory.Community);
    const showIndividual = categories.includes(BadgeCategory.Individual);

    if (!(showOfficial && showCommunity && showIndividual)) {
      const orClauses: InputMaybe<Badge_filter>[] = [];
      if (showOfficial) orClauses.push({ isOfficial: true });
      if (showCommunity)
        orClauses.push({ isOfficial: false, isCommunity: true });
      if (showIndividual)
        orClauses.push({ isOfficial: false, isCommunity: false });

      whereClauses.push({ or: orClauses });
    }
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

  return requireGraphData(res.data as BadgeQuery | undefined, "Badge");
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
    includeProfile: mergedOptions.includeProfile,
    isCommunity: mergedOptions.isCommunity,
    categories: mergedOptions.categories,
  });

  const res = await execute(BadgesDocument, {
    first: mergedOptions.pageSize,
    skip: mergedOptions.skip,
    orderBy: mergedOptions.orderBy,
    orderDirection: mergedOptions.orderDirection,
    where,
  });

  return requireGraphData(res.data as BadgesQuery | undefined, "Badges");
};

/**
 * Gets the badge permissions for a user.
 *
 * @param badge Badge data
 * @param userAddress User address, or every address the user acts as
 * (Society address and owner wallet). A right held by any of them counts.
 * @returns Badge permissions { canMint: boolean, canBurn: boolean, canTransfer: boolean }
 *
 */
export const getBadgePermissions = (
  badge: FullBadgeData,
  userAddress: Address | readonly Address[],
) => {
  const userAddresses = (
    typeof userAddress === "string" ? [userAddress] : userAddress
  ).map((address) => address.toLowerCase());
  const hasAny = (set: Set<string>) =>
    userAddresses.some((address) => set.has(address));

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
    canMint: hasAny(mintersSet),
    canBurn: hasAny(burnersSet),
    canTransfer: hasAny(transferersSet),
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
