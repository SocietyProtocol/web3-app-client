import { UserQueryOptions } from "./types";

export const defaultOptions: UserQueryOptions & {
  pageSize: number;
} = {
  searchText: "",
  orderBy: "id",
  orderDirection: "desc",
  pageSize: 1000,
  includeUnregistered: false,
};
