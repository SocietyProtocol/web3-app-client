import { useMemo, useReducer, useState } from "react";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { useUsersQuery } from "@/data/users/useUsersQuery";
import { Hex, isAddress } from "viem";
import { CustomAutocomplete } from "@/components/CustomAutocomplete/CustomAutocomplete";
import { UserHandle } from "@/components/User/UserHandle";
import { AutocompleteProps } from "@mui/material";
import { UsersQuery } from "../../../../.graphclient";
import { upsertIntoMapByKey } from "@/utils/map";
import { prop, toLowerCase } from "@/utils/curry";

export interface UserOption {
  id: string;
  name?: string;
  imageUrl?: string;
}

interface UserAutocompleteProps<Multiple extends boolean = false> {
  label?: string;
  tooltip?: string;
  value: Multiple extends true ? string[] : string | undefined;
  onChange: AutocompleteProps<UserOption, Multiple, false, true>["onChange"];
  multiple?: Multiple;
}

export const UserAutocomplete = <Multiple extends boolean = false>({
  label,
  tooltip,
  value,
  onChange,
  multiple,
}: UserAutocompleteProps<Multiple>) => {
  const [allUsersMap, setAllUsersMap] = useReducer<
    Map<string, UserOption>,
    [UsersQuery]
  >(
    (prev, next) =>
      upsertIntoMapByKey(
        prev,
        next.users as UserOption[],
        toLowerCase(prop("id")),
      ),
    new Map(),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const { data, isLoading, isFetching } = useUsersQuery({
    searchText: debouncedSearchQuery,
    pageSize: 50,
    onSuccess: setAllUsersMap,
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

  const selectedUsers: Multiple extends true
    ? UserOption[]
    : UserOption | null = useMemo(() => {
    if (multiple) {
      return (value as string[]).map(
        (id) =>
          allUsersMap.get(id.toLowerCase()) ?? {
            id,
          },
      ) as Multiple extends true ? UserOption[] : UserOption | null;
    } else {
      if (value) {
        return (allUsersMap.get((value as string).toLowerCase()) ?? {
          id: value as string,
        }) as Multiple extends true ? UserOption[] : UserOption | null;
      } else {
        return null as Multiple extends true ? UserOption[] : UserOption | null;
      }
    }
  }, [multiple, allUsersMap, value]);

  const options = useMemo(
    () =>
      users
        .map(({ id }) => allUsersMap.get(id))
        .filter((u): u is UserOption => !!u),
    [allUsersMap, users],
  );

  return (
    <CustomAutocomplete
      multiple={multiple}
      freeSolo
      label={label}
      tooltip={tooltip}
      onChange={onChange}
      options={options}
      value={selectedUsers}
      loading={isLoading || isFetching}
      valueKey="id"
      mapNewValue={(id) => ({
        id,
        name: "Add ",
        imageUrl: undefined,
      })}
      validateNewValue={isAddress}
      getOptionLabel={(option) => {
        if (typeof option === "string") {
          return option;
        }
        return option.name ? `${option.name} (${option.id})` : option.id;
      }}
      renderItem={(item) => (
        <UserHandle
          id={item.id as Hex}
          name={item.name}
          imageUrl={item.imageUrl}
          highlightYou
          fullAddress={!multiple}
        />
      )}
      inputValue={searchQuery}
      onInputChange={(_, value, reason) => {
        if (reason !== "reset") {
          setSearchQuery(value);
        }
      }}
      placeholder={
        (Array.isArray(selectedUsers) && selectedUsers.length === 0) ||
        !selectedUsers
          ? "Search users by name or ID..."
          : ""
      }
    />
  );
};
