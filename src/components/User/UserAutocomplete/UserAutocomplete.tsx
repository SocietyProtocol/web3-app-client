import { useMemo, useState } from "react";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { useUsersQuery } from "@/data/users/useUsersQuery";
import { Hex, isAddress } from "viem";
import { CustomAutocomplete } from "@/components/CustomAutocomplete/CustomAutocomplete";
import { AutocompleteProps, AutocompleteValue } from "@mui/material";
import { useAtom } from "jotai";
import { usersAtom } from "@/atoms/users";
import { renderUserOption } from "./renderUserOption";
import { renderUserItem } from "./renderUserItem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { isEqualCaseInsensitive } from "@/utils/string";

type SelectedUsers<
  Multiple extends boolean,
  DisableClearable extends boolean,
  FreeSolo extends boolean,
> = AutocompleteValue<UserOption, Multiple, DisableClearable, FreeSolo>;

export interface UserOption {
  id: string;
  name?: string;
  imageUrl?: string;
}

interface UserAutocompleteProps<
  Multiple extends boolean = false,
  DisableClearable extends boolean = false,
  FreeSolo extends boolean = false,
> {
  label?: string;
  tooltip?: string;
  value: Multiple extends true ? string[] : string | undefined;
  onChange: AutocompleteProps<
    UserOption,
    Multiple,
    DisableClearable,
    FreeSolo
  >["onChange"];
  multiple?: Multiple;
  disabled?: boolean;
  filterOptions?: AutocompleteProps<
    UserOption,
    Multiple,
    DisableClearable,
    FreeSolo
  >["filterOptions"];
  error?: boolean;
  helperText?: string;
  freeSolo?: FreeSolo;
}

export const UserAutocomplete = <
  Multiple extends boolean = false,
  DisableClearable extends boolean = false,
  FreeSolo extends boolean = false,
>({
  label,
  tooltip,
  value,
  onChange,
  multiple,
  freeSolo,
  disabled = false,
  filterOptions,
  error,
  helperText,
}: UserAutocompleteProps<Multiple, DisableClearable, FreeSolo>) => {
  const [allUsersMap, upsertAllUserMap] = useAtom(usersAtom);
  const communityRegistry = useChainVar(contracts.communityRegistry);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const { data, isLoading, isFetching } = useUsersQuery({
    searchText: debouncedSearchQuery,
    pageSize: 50,
    includeUnregistered: true,
    onSuccess: upsertAllUserMap,
  });

  const users: UserOption[] = useMemo(
    () =>
      data?.pages
        .flatMap((page) => page.users)
        .map((user) => ({
          id: user.id as Hex,
          name: user.name as string,
          imageUrl: user.imageUrl as string | undefined,
        })) || [],
    [data],
  );

  const selectedUsers: SelectedUsers<Multiple, DisableClearable, FreeSolo> =
    useMemo(() => {
      if (multiple) {
        return (value as string[]).map(
          (id) =>
            allUsersMap.get(id.toLowerCase()) ?? {
              id,
            },
        ) as SelectedUsers<Multiple, DisableClearable, FreeSolo>;
      } else {
        if (value) {
          return (allUsersMap.get((value as string).toLowerCase()) ?? {
            id: value as string,
          }) as SelectedUsers<Multiple, DisableClearable, FreeSolo>;
        } else {
          return null as SelectedUsers<Multiple, DisableClearable, FreeSolo>;
        }
      }
    }, [multiple, allUsersMap, value]);

  const options = useMemo(
    () =>
      users
        .map(({ id }) => allUsersMap.get(id.toLowerCase()))
        .filter(
          (u): u is UserOption =>
            !!u && !isEqualCaseInsensitive(u.id, communityRegistry),
        ),
    [allUsersMap, users, communityRegistry],
  );

  return (
    <CustomAutocomplete
      multiple={multiple}
      freeSolo={freeSolo}
      disabled={disabled}
      label={label}
      tooltip={tooltip}
      onChange={onChange}
      options={options}
      value={selectedUsers}
      loading={isLoading || isFetching}
      valueKey="id"
      mapNewValue={(id) => {
        if (
          freeSolo &&
          isAddress(id, {
            strict: false,
          })
        ) {
          return {
            id,
            name: `Add ${id} as a new user`,
            imageUrl: undefined,
          };
        }

        return undefined;
      }}
      validateNewValue={isAddress}
      getOptionLabel={(option) => {
        if (typeof option === "string") {
          return option;
        }
        return option.name ? `${option.name} (${option.id})` : option.id;
      }}
      renderOption={renderUserOption}
      renderItem={(item) => renderUserItem(item, !!multiple)}
      inputValue={searchQuery}
      onInputChange={(_, value, reason) => {
        if (reason !== "reset") {
          setSearchQuery(value);
        }
      }}
      placeholder={
        (Array.isArray(selectedUsers) && selectedUsers.length === 0) ||
        !selectedUsers
          ? "Search users by name or ID or enter an address..."
          : ""
      }
      filterOptions={filterOptions}
      error={error}
      helperText={helperText}
    />
  );
};
