import { useEffect, useMemo, useState } from "react";
import { BadgeHandle } from "../BadgeHandle";
import { useBadgesQuery } from "../../../data/badges/useBadgesQuery";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { CustomAutocomplete } from "@/components/CustomAutocomplete/CustomAutocomplete";
import { AutocompleteProps } from "@mui/material";
import { renderBadgeOption } from "./renderBadgeOption";
import { BadgeOption } from "./types";

interface BadgeAutocompleteProps {
  label: string;
  value: string[];
  onChange: AutocompleteProps<BadgeOption, true, false, true>["onChange"];
  tooltip?: string;
}

export const BadgeAutocomplete = ({
  label,
  value,
  onChange,
  tooltip,
}: BadgeAutocompleteProps) => {
  const [selectedBadgeMap, setSelectedBadgeMap] = useState<
    Map<string, BadgeOption>
  >(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const { data, isLoading, isFetching } = useBadgesQuery({
    searchText: debouncedSearchQuery,
    includeProfile: true,
    pageSize: 50,
  });

  const badges = useMemo(
    () => data?.pages.flatMap((page) => page.badges) || [],
    [data],
  );

  // Update selectedBadgeMap when badges are found
  useEffect(() => {
    queueMicrotask(() => {
      setSelectedBadgeMap((prev) => {
        const newMap = new Map(prev);
        badges.forEach((badge) => {
          if (value.includes(badge.id)) {
            newMap.set(badge.id, badge);
          }
        });
        return newMap;
      });
    });
  }, [badges, value]);

  const selectedBadges = useMemo(
    () =>
      value
        .map((id) => selectedBadgeMap.get(id))
        .filter((badge): badge is BadgeOption => !!badge),
    [value, selectedBadgeMap],
  );

  return (
    <CustomAutocomplete
      multiple
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
        selectedBadges.length === 0 ? "Search badges by name or ID..." : ""
      }
    />
  );
};
