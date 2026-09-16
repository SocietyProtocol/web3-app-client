import { OrderDirection } from "../../../.graphclient";
import { ALL_ACCOUNT_ROLES, AccountSortOption } from "../accounts/types";
import { UserQueryOptions } from "./types";

export const defaultOptions: Omit<
  UserQueryOptions,
  "orderBy" | "orderDirection" | "pageSize"
> & {
  orderBy: AccountSortOption;
  orderDirection: OrderDirection;
  pageSize: number;
} = {
  searchText: "",
  roles: ALL_ACCOUNT_ROLES,
  orderBy: AccountSortOption.Newest,
  orderDirection: "desc",
  pageSize: 50,
  includeUnregistered: false,
};
