import { FilterSelectOption } from "../../components/FilterSelect/FilterSelect";
import { SortOption } from "./types";

export const sortOptions: FilterSelectOption<SortOption>[] = [
  { value: SortOption.Newest, label: "Newest" },
  { value: SortOption.Name, label: "Name" },
];
