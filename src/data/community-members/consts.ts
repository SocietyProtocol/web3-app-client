import { FilterSelectOption } from "@/components/FilterSelect/FilterSelect";
import {
  CommunityMembersQueryOptions,
  CommunityMembersSortOption,
} from "./types";

export const ROWS_PER_PAGE = 10;

export const communityMemberSortOptions: FilterSelectOption<CommunityMembersSortOption>[] =
  [
    { value: CommunityMembersSortOption.Newest, label: "Newest" },
    { value: CommunityMembersSortOption.Oldest, label: "Oldest" },
    { value: CommunityMembersSortOption.Name, label: "Name" },
  ];

export const defaultOptions: CommunityMembersQueryOptions & {
  pageSize: number;
} = {
  communityId: "",
  searchText: "",
  orderBy: CommunityMembersSortOption.Newest,
  orderDirection: "desc",
  pageSize: ROWS_PER_PAGE,
  skip: 0,
};
