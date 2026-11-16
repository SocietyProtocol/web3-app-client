import {
  CommunityMembersDocument,
  CommunityMembersQuery,
  CommunityMembership_filter,
  CommunityMembership_orderBy,
  execute,
  User_filter,
  UsersDocument,
  UsersQuery,
} from "../../../.graphclient";
import { requireGraphData } from "@/lib/graph-response";
import { defaultOptions } from "./consts";
import {
  CommunityMembersQueryOptions,
  CommunityMembersSortOption,
} from "./types";

/**
 * Most members a display-name search looks up. A member's display name is
 * on their profile Metadata, which graph-node cannot reach from a
 * CommunityMembership filter, so the matching users are looked up first
 * and passed back by id. Must stay within the query gateway's array limit
 * for CommunityMembers.
 */
export const MAX_NAME_MATCHES = 100;

/**
 * Merges the provided options with the default options.
 *
 * @param options Options to merge
 * @returns Merged options
 */
export const mergeOptions = (
  options?: CommunityMembersQueryOptions,
): CommunityMembersQueryOptions => {
  const { searchText } = options || {};

  return {
    ...defaultOptions,
    ...options,
    searchText: (searchText ?? defaultOptions.searchText)
      ?.trim()
      .replace(/\s+/g, " "),
  };
};

/**
 * Ids of the community's members whose profile name contains the search
 * text. A Users query: there metadata_ is a single child filter, which
 * graph-node supports.
 */
export const fetchNameMatchedMemberIds = async (
  communityId: string,
  searchText: string,
): Promise<string[]> => {
  const res = await execute(UsersDocument, {
    first: MAX_NAME_MATCHES,
    skip: 0,
    // The query gateway only allows the directory's orderings for Users.
    orderBy: "profile__createdAt",
    orderDirection: "asc",
    where: {
      communities_contains: [communityId],
      metadata_: { name_contains_nocase: searchText },
    },
  });
  const data = requireGraphData(res.data as UsersQuery | undefined, "Users");
  return data.users.map((user) => user.id);
};

/**
 * Builds the CommunityMembership filter. graph-node runs only one level of
 * child filter, so user_ holds filters on User's own fields only (never
 * metadata_): the user's name, their address, and the ids of the members
 * whose profile name matched.
 */
export const buildWhereClause = (
  communityId: string,
  searchText: string,
  nameMatchedUserIds: string[] = [],
): CommunityMembership_filter => {
  const where: CommunityMembership_filter = {
    community_: {
      id: communityId,
    },
  };

  if (searchText) {
    const or: User_filter[] = [
      { name_contains_nocase: searchText },
      { id: searchText.toLowerCase() },
    ];
    if (nameMatchedUserIds.length > 0) {
      or.push({ id_in: nameMatchedUserIds });
    }
    where.user_ = { or };
  }

  return where;
};

const buildSorting = (
  sort: CommunityMembersSortOption = CommunityMembersSortOption.Newest,
): {
  orderBy: CommunityMembership_orderBy;
  orderDirection: "asc" | "desc";
} => {
  if (sort === CommunityMembersSortOption.Name) {
    return {
      orderBy: "user__name",
      orderDirection: "asc",
    };
  } else {
    return {
      orderBy: "joinActivity__timestamp",
      orderDirection:
        sort === CommunityMembersSortOption.Newest ? "desc" : "asc",
    };
  }
};

/**
 * Fetches members of a community based on the provided variables.
 *
 * @param variables Query variables
 * @returns Community members data
 */
export const fetchCommunityMembers = async (
  options: CommunityMembersQueryOptions,
): Promise<CommunityMembersQuery> => {
  const mergedOptions = mergeOptions(options);
  const searchText = mergedOptions.searchText ?? "";
  const nameMatchedUserIds = searchText
    ? await fetchNameMatchedMemberIds(mergedOptions.communityId, searchText)
    : [];
  const where = buildWhereClause(
    mergedOptions.communityId,
    searchText,
    nameMatchedUserIds,
  );
  const { orderBy, orderDirection } = buildSorting(mergedOptions.orderBy);

  const res = await execute(CommunityMembersDocument, {
    first: mergedOptions.pageSize,
    skip: mergedOptions.skip,
    orderBy,
    orderDirection,
    where,
  });

  return requireGraphData(
    res.data as CommunityMembersQuery | undefined,
    "CommunityMembers",
  );
};
