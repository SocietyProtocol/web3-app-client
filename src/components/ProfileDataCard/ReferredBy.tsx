import { DataItem } from "./DataItem";
import { UserHandle } from "../User/UserHandle";
import { Hex, zeroAddress } from "viem";
import { AcceptInvitation } from "./AcceptInvitation";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useMemo } from "react";
import { truncateAddress } from "@/utils/string";

interface ReferredByProps {
  readonly?: boolean;
  address?: Hex;
  loading?: boolean;
}

export const ReferredBy = ({
  readonly = false,
  address,
  loading,
}: ReferredByProps) => {
  const user = useUserQuery(
    address && address !== zeroAddress ? address : undefined,
  );

  const username = useMemo(
    () =>
      user.data?.name || (address ? `${truncateAddress(address)}` : "Unknown"),
    [user.data?.name, address],
  );

  return !readonly && address === zeroAddress && !loading ? (
    <AcceptInvitation />
  ) : (
    <DataItem
      loading={loading || user.isLoading}
      label="Referred by"
      tooltip="The user who referred this account."
    >
      {loading || (address && address !== zeroAddress) || user.isLoading ? (
        <UserHandle
          loading={loading || user.isLoading}
          id={address}
          name={username}
          bio={user.data?.bio}
          imageUrl={user.data?.imageUrl}
          showPreview
          highlightYou
          link
        />
      ) : (
        "Not referred by anyone"
      )}
    </DataItem>
  );
};
