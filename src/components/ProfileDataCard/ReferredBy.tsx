import { DataItem } from "./DataItem";
import { UserHandle } from "../User/UserHandle";
import { Hex, zeroAddress } from "viem";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useMemo } from "react";
import { truncateAddress } from "@/utils/string";

interface ReferredByProps {
  userAddress?: Hex;
}

export const ReferredBy = ({ userAddress }: ReferredByProps) => {
  const user = useUserQuery(
    userAddress && userAddress !== zeroAddress ? userAddress : undefined,
  );

  const invitedByAddress = user.data?.invitedBy?.id
    ? (user.data.invitedBy.id as Hex)
    : undefined;

  const invitedByUsername = useMemo(
    () =>
      user.data?.invitedBy?.name ||
      (invitedByAddress ? `${truncateAddress(invitedByAddress)}` : "Unknown"),
    [user.data?.invitedBy?.name, invitedByAddress],
  );

  return (
    <DataItem
      loading={user.isLoading}
      label="Referred by"
      tooltip="The user who referred this account."
    >
      {user.data?.invitedBy || user.isLoading ? (
        <UserHandle
          loading={user.isLoading}
          id={user.data?.invitedBy?.id as Hex | undefined}
          name={invitedByUsername}
          bio={user.data?.invitedBy?.bio as string | undefined}
          imageUrl={user.data?.invitedBy?.imageUrl}
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
