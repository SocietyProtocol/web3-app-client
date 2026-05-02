import { useEffect, useMemo, useState } from "react";
import { BadgeHandle } from "../BadgeHandle";
import { useBadgesQuery } from "../../../data/badges/useBadgesQuery";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { CustomAutocomplete } from "@/components/CustomAutocomplete/CustomAutocomplete";
import { AutocompleteProps, AutocompleteValue } from "@mui/material";
import { renderBadgeOption } from "./renderBadgeOption";
import { BadgeOption } from "./types";
import { BadgeQueryOptions } from "@/data/badges/types";

type SelectedBadges<
  Multiple extends boolean,
  DisableClearable extends boolean,
> = AutocompleteValue<BadgeOption, Multiple, DisableClearable, true>;

interface BadgeAutocompleteProps<
  Multiple extends boolean = false,
  DisableClearable extends boolean = false,
> {
  label: string;
  tooltip?: string;
  queryOptions?: Omit<BadgeQueryOptions, "searchText">;
  optionFilter?: (badge: BadgeOption) => boolean;
  value: Multiple extends true ? string[] : string | undefined;
  onChange: AutocompleteProps<
    BadgeOption,
    Multiple,
    DisableClearable,
    true
  >["onChange"];
  multiple?: Multiple;
}

export const BadgeAutocomplete = <
  Multiple extends boolean = false,
  DisableClearable extends boolean = false,
>({
  label,
  tooltip,
  queryOptions,
  optionFilter,
  value,
  onChange,
  multiple,
}: BadgeAutocompleteProps<Multiple, DisableClearable>) => {
  const [selectedBadgeMap, setSelectedBadgeMap] = useState<
    Map<string, BadgeOption>
  >(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const { data, isLoading, isFetching } = useBadgesQuery({
    searchText: debouncedSearchQuery,
    includeProfile: true,
    pageSize: 50,
    ...queryOptions,
  });

  const badges = useMemo(() => {
    const fetchedBadges = data?.pages.flatMap((page) => page.badges) || [];
    if (!optionFilter) return fetchedBadges;
    return fetchedBadges.filter(optionFilter);
  }, [data, optionFilter]);

  const selectedBadgeIds = useMemo((): string[] => {
    if (multiple) return value as string[];
    return value ? [value as string] : [];
  }, [multiple, value]);

  // Update selectedBadgeMap when badges are found
  useEffect(() => {
    queueMicrotask(() => {
      setSelectedBadgeMap((prev) => {
        const newMap = new Map(prev);
        badges.forEach((badge) => {
          if (selectedBadgeIds.includes(badge.id)) {
            newMap.set(badge.id, badge);
          }
        });
        return newMap;
      });
    });
  }, [badges, selectedBadgeIds]);

  const selectedBadges: SelectedBadges<Multiple, DisableClearable> =
    useMemo(() => {
      const found = selectedBadgeIds
        .map((id) => selectedBadgeMap.get(id))
        .filter((badge): badge is BadgeOption => !!badge);

      if (multiple) {
        return found as SelectedBadges<Multiple, DisableClearable>;
      }
      return (found[0] ?? null) as SelectedBadges<Multiple, DisableClearable>;
    }, [multiple, selectedBadgeIds, selectedBadgeMap]);

  const CustomAutocompleteBadge =
    CustomAutocomplete as typeof CustomAutocomplete<
      BadgeOption,
      Multiple,
      DisableClearable,
      true
    >;

  return (
    <CustomAutocompleteBadge
      multiple={multiple}
      freeSolo
      label={label}
      tooltip={tooltip}
      onChange={onChange}
      options={badges}
      value={selectedBadges}
      loading={isLoading || isFetching}
      filterOptions={(options) => options}
      valueKey="id"
      getOptionLabel={(option) =>
        typeof option === "string"
          ? option
          : `${option.name} (ID: ${option.id})`
      }
      renderOption={renderBadgeOption}
      renderItem={(item) => (
        <BadgeHandle
          id={item.id}
          name={item.name}
          profileUser={item.profileUser}
        />
      )}
      inputValue={searchQuery}
      onInputChange={(_, value, reason) => {
        if (reason !== "reset") {
          setSearchQuery(value);
        }
      }}
      placeholder={
        (Array.isArray(selectedBadges) && selectedBadges.length === 0) ||
        !selectedBadges
          ? "Search badges by name or ID..."
          : ""
      }
    />
  );
};
