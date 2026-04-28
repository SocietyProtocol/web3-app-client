import { FilterSelectOption } from "../../components/FilterSelect/FilterSelect";
import { CommunityQueryOptions, CommunitySortOption } from "./types";

export const communitySortOptions: FilterSelectOption<CommunitySortOption>[] = [
  { value: CommunitySortOption.Id, label: "ID" },
  { value: CommunitySortOption.MemberCount, label: "Members" },
];

export const defaultOptions: CommunityQueryOptions & {
  pageSize: number;
} = {
  searchText: "",
  managerAddress: undefined,
  memberAddress: undefined,
  tiers: undefined,
  orderBy: "id",
  orderDirection: "desc",
  pageSize: 50,
};
