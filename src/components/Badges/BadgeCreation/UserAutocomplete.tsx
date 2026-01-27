import { useEffect, useMemo, useState } from "react";
import { useDebounceValue } from "@/hooks/useDebounceValue";
import { useUsersQuery } from "@/data/users/useUsersQuery";
import { UserHandle } from "@/components/UserHandle/UserHandle";
import { Address, isAddress } from "viem";
import { CustomAutocomplete } from "@/components/CustomAutocomplete/CustomAutocomplete";

interface UserAutocompleteProps {
  label: string;
  tooltip?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export const UserAutocomplete = ({
  label,
  tooltip,
  value,
  onChange,
}: UserAutocompleteProps) => {
  const [selectedUserMap, setSelectedUserMap] = useState<
    Map<string, { id: string; name?: string | null }>
  >(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  const { data, isLoading, isFetching } = useUsersQuery({
    searchText: debouncedSearchQuery,
    pageSize: 50,
  });

  const users = useMemo(
    () => data?.pages.flatMap((page) => page.users) || [],
    [data],
  );

  // Update selectedUserMap when users are found
  useEffect(() => {
    users.forEach((user) => {
      if (value.includes(user.id)) {
        setSelectedUserMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(user.id.toLowerCase(), user);
          return newMap;
        });
      }
    });
  }, [users, value]);

  const selectedUsers = useMemo(
    () =>
      value.map(
        (id) => selectedUserMap.get(id.toLowerCase()) ?? { id, name: "" },
      ),
    [selectedUserMap, value],
  );

  return (
    <CustomAutocomplete
      label={label}
      tooltip={tooltip}
      onChange={onChange}
      options={users}
      value={selectedUsers}
      loading={isLoading || isFetching}
      valueKey="id"
      mapNewValue={(id) => ({
        id,
        name: "Add ",
      })}
      validateNewValue={isAddress}
      getOptionLabel={(option) => {
        if (typeof option === "string") {
          return option;
        }
        return option.name ? `${option.name} (${option.id})` : option.id;
      }}
      renderItem={(item) => <UserHandle address={item.id as Address} />}
      inputValue={searchQuery}
      onInputChange={(_, value, reason) => {
        if (reason !== "reset") {
          setSearchQuery(value);
        }
      }}
      placeholder={
        selectedUsers.length === 0 ? "Search users by name or ID..." : ""
      }
    />
  );
};
