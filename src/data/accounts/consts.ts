import { FilterSelectOption } from "../../components/FilterSelect/FilterSelect";
import { AccountSortOption } from "./types";

export const sortOptions: FilterSelectOption<AccountSortOption>[] = [
  { value: AccountSortOption.Newest, label: "Newest" },
  { value: AccountSortOption.Name, label: "Name" },
];
