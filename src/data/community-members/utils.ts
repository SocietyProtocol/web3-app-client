import {
  CommunityMembersDocument,
  CommunityMembersQuery,
  execute,
  InputMaybe,
  MemberJoinedActivity_filter,
  MemberJoinedActivity_orderBy,
} from "../../../.graphclient";
import { defaultOptions } from "./consts";
import {
  CommunityMembersQueryOptions,
  CommunityMembersSortOption,
} from "./types";

import { buildWhereClause as buildUserWhereClause } from "../users/utils";

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

const buildWhereClause = (
  communityId: string,
  searchText: string,
): InputMaybe<InputMaybe<MemberJoinedActivity_filter>> => {
  const where: InputMaybe<MemberJoinedActivity_filter> = {
    community_: {
      id: communityId,
    },
  };

  if (searchText) {
    where.user_ = buildUserWhereClause({
      searchText,
      includeUnregistered: true,
    });
  }

  return where;
};

const buildSorting = (
  sort: CommunityMembersSortOption = CommunityMembersSortOption.Newest,
): {
  orderBy: MemberJoinedActivity_orderBy;
  orderDirection: "asc" | "desc";
} => {
  if (sort === CommunityMembersSortOption.Name) {
    return {
      orderBy: "user__name",
      orderDirection: "asc",
    };
  } else {
    return {
      orderBy: "timestamp",
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
  const membersWhere = buildWhereClause(
    mergedOptions.communityId,
    mergedOptions.searchText ?? "",
  );

  const { orderBy, orderDirection } = buildSorting(mergedOptions.orderBy);

  const res = await execute(CommunityMembersDocument, {
    first: mergedOptions.pageSize,
    skip: mergedOptions.skip,
    orderBy,
    orderDirection,
    where: membersWhere,
  });

  return res.data as CommunityMembersQuery;
};
