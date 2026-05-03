import { AccountSortOption } from "../accounts/types";
import { UserQueryOptions } from "./types";

export const defaultOptions: Omit<
  UserQueryOptions,
  "orderBy" | "orderDirection" | "pageSize"
> & {
  orderBy: AccountSortOption;
  orderDirection: "asc" | "desc";
  pageSize: number;
} = {
  searchText: "",
  orderBy: AccountSortOption.Newest,
  orderDirection: "desc",
  pageSize: 1000,
  includeUnregistered: false,
};
