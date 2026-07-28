import { FilterSelectOption } from "../../components/FilterSelect/FilterSelect";
import { BadgeQueryOptions, CreatedByOption, BadgeSortOption } from "./types";

export const sortOptions: FilterSelectOption<BadgeSortOption>[] = [
  { value: BadgeSortOption.Newest, label: "Newest" },
  { value: BadgeSortOption.Holders, label: "Holders" },
  { value: BadgeSortOption.Name, label: "Name" },
  { value: BadgeSortOption.Id, label: "ID" },
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
