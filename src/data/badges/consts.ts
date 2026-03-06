import { FilterSelectOption } from "../../components/FilterSelect/FilterSelect";
import { BadgeQueryOptions, CreatedByOption, SortOption } from "./types";

export const sortOptions: FilterSelectOption<SortOption>[] = [
  { value: SortOption.Newest, label: "Newest" },
  { value: SortOption.Holders, label: "Holders" },
  { value: SortOption.Name, label: "Name" },
  { value: SortOption.Id, label: "ID" },
];

export const filterOptions: FilterSelectOption<CreatedByOption>[] = [
  { value: CreatedByOption.Anyone, label: "Anyone" },
  { value: CreatedByOption.Me, label: "Me" },
  { value: CreatedByOption.Address, label: "Address" },
];

export const defaultOptions: BadgeQueryOptions & {
  pageSize: number;
} = {
  searchText: "",
  creatorAddress: undefined,
  managerAddress: undefined,
  holderAddress: undefined,
  includeProfile: false,
  orderBy: "id",
  orderDirection: "desc",
  pageSize: 1000,
};
