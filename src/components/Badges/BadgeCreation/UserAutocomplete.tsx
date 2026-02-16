import { useMemo, useState } from "react";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { useUsersQuery } from "@/data/users/useUsersQuery";
import { Hex, isAddress } from "viem";
import { CustomAutocomplete } from "@/components/CustomAutocomplete/CustomAutocomplete";
import { UserHandle } from "@/components/User/UserHandle";
import { AutocompleteProps } from "@mui/material";
import { useAtom } from "jotai";
import { usersAtom } from "@/atoms/users";

type SelectedUsers<Multiple extends boolean> = Multiple extends true
  ? UserOption[]
  : UserOption | null;

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
  disabled?: boolean;
  excludeIds?: string[];
}

export const UserAutocomplete = <Multiple extends boolean = false>({
  label,
  tooltip,
  value,
  onChange,
  multiple,
  disabled = false,
  excludeIds = [],
}: UserAutocompleteProps<Multiple>) => {
  const [allUsersMap, upsertAllUserMap] = useAtom(usersAtom);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const { data, isLoading, isFetching } = useUsersQuery({
    searchText: debouncedSearchQuery,
    pageSize: 50,
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

  const selectedUsers: SelectedUsers<Multiple> = useMemo(() => {
    if (multiple) {
      return (value as string[]).map(
        (id) =>
          allUsersMap.get(id.toLowerCase()) ?? {
            id,
          },
      ) as SelectedUsers<Multiple>;
    } else {
      if (value) {
        return (allUsersMap.get((value as string).toLowerCase()) ?? {
          id: value as string,
        }) as SelectedUsers<Multiple>;
      } else {
        return null as SelectedUsers<Multiple>;
      }
    }
  }, [multiple, allUsersMap, value]);

  const options = useMemo(
    () =>
      users
        .map(({ id }) => allUsersMap.get(id.toLowerCase()))
        .filter((u): u is UserOption => !!u && !excludeIds.includes(u.id)),
    [allUsersMap, users, excludeIds],
  );

  return (
    <CustomAutocomplete
      multiple={multiple}
      freeSolo
      disabled={disabled}
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
