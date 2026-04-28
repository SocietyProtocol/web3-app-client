import { FilterSelectOption } from "../../components/FilterSelect/FilterSelect";
import { CommunityQueryOptions, CommunitySortOption } from "./types";

export const communitySortOptions: FilterSelectOption<CommunitySortOption>[] = [
  { value: CommunitySortOption.Tier, label: "Tier" },
  { value: CommunitySortOption.Alphabetical, label: "Alphabetical" },
  { value: CommunitySortOption.Newest, label: "Newest" },
  { value: CommunitySortOption.MemberCount, label: "Members" },
];

export const defaultOptions: CommunityQueryOptions & {
  pageSize: number;
} = {
  searchText: "",
  managerAddress: undefined,
  memberAddress: undefined,
  tiers: undefined,
  orderBy: CommunitySortOption.Tier,
  orderDirection: "desc",
  pageSize: 50,
};
