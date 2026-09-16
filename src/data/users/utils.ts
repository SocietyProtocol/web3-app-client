import {
  execute,
  InputMaybe,
  ProtocolRole,
  User_filter,
  UsersDocument,
  UsersQuery,
} from "../../../.graphclient";
import { requireGraphData } from "@/lib/graph-response";
import {
  ALL_ACCOUNT_ROLES,
  AccountRole,
  AccountSortOption,
} from "../accounts/types";
import { defaultOptions } from "./consts";
import { UserQueryOptions } from "./types";

const ACCOUNT_ROLE_TO_PROTOCOL: Record<
  Exclude<AccountRole, AccountRole.Basic>,
  ProtocolRole
> = {
  [AccountRole.Governors]: "GOVERNOR" as ProtocolRole,
  [AccountRole.Contributors]: "CONTRIBUTOR" as ProtocolRole,
  [AccountRole.CoreTeam]: "CORE_TEAM" as ProtocolRole,
  [AccountRole.Advisors]: "ADVISOR" as ProtocolRole,
  [AccountRole.Moderators]: "MODERATOR" as ProtocolRole,
};

export const isUnfilteredAccountRoles = (
  roles?: AccountRole[] | null,
): boolean => {
  if (!roles || roles.length === 0) {
    return true;
  }
  if (roles.length !== ALL_ACCOUNT_ROLES.length) {
    return false;
  }
  return ALL_ACCOUNT_ROLES.every((role) => roles.includes(role));
};

/**
 * Merges the provided options with the default options.
 *
 * @param options Options to merge
 * @returns Merged options
 */
export const mergeOptions = (
  options?: UserQueryOptions,
): Omit<UserQueryOptions, "orderBy"> & {
  pageSize: number;
  orderBy: AccountSortOption;
  orderDirection: "asc" | "desc";
} => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { searchText, onSuccess, ...rest } = options || {};
  const orderBy = options?.orderBy ?? defaultOptions.orderBy;

  return {
    ...defaultOptions,
    ...rest,
    searchText: (searchText ?? defaultOptions.searchText)
      ?.toLowerCase()
      .trim()
      .replace(/\s+/g, " "),
    orderBy,
    orderDirection: orderBy === AccountSortOption.Name ? "asc" : "desc",
    skip: options?.skip ?? 0,
  };
};

/**
 * Builds a where clause for querying users based on the provided options.
 *
 * @param options Options to build the where clause from
 * @returns Where clause object
 */
export const buildWhereClause = (options: {
  searchText?: string | null;
  includeUnregistered?: boolean;
  roles?: AccountRole[] | null;
}) => {
  const { searchText, includeUnregistered, roles } = options;

  const whereClauses: InputMaybe<InputMaybe<User_filter>[]> = [];

  if (searchText && searchText.trim() !== "") {
    const trimmedSearch = searchText.trim();
    whereClauses.push({
      or: [
        { name_contains_nocase: trimmedSearch },
        { metadata_: { name_contains_nocase: trimmedSearch } },
        {
          id: trimmedSearch,
        },
      ],
    });
  }

  if (!includeUnregistered) {
    whereClauses.push({ profile_not: null });
  }

  if (!isUnfilteredAccountRoles(roles)) {
    const roleClauses: User_filter[] = [];
    for (const role of roles ?? []) {
      if (role === AccountRole.Basic) {
        roleClauses.push({ protocolRoleCount: 0 });
        continue;
      }
      roleClauses.push({
        protocolRoles_contains: [ACCOUNT_ROLE_TO_PROTOCOL[role]],
      });
    }
    if (roleClauses.length === 1) {
      whereClauses.push(roleClauses[0]);
    } else if (roleClauses.length > 1) {
      whereClauses.push({ or: roleClauses });
    }
  }

  return { and: whereClauses };
};

/**
 * Fetches users based on the provided query options.
 *
 * @param options Query options
 * @returns Users data
 */
export const fetchUsers = async (options?: UserQueryOptions) => {
  const mergedOptions = mergeOptions(options);

  const where = buildWhereClause({
    searchText: mergedOptions.searchText,
    includeUnregistered: mergedOptions.includeUnregistered,
    roles: mergedOptions.roles,
  });

  const res = await execute(UsersDocument, {
    first: mergedOptions.pageSize,
    skip: mergedOptions.skip,
    orderBy: mergedOptions.orderBy,
    orderDirection: mergedOptions.orderDirection,
    where,
  });

  return requireGraphData(res.data as UsersQuery | undefined, "Users");
};
