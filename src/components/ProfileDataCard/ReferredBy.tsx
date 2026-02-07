import { useInvitedBy } from "./useInvitedBy";
import { DataItem } from "./DataItem";
import { UserHandle } from "../User/UserHandle";
import { Hex, zeroAddress } from "viem";
import { AcceptInvitation } from "./AcceptInvitation";

interface ReferredByProps {
  readonly?: boolean;
  address?: Hex;
}

export const ReferredBy = ({ readonly = false, address }: ReferredByProps) => {
  const invitedBy = useInvitedBy(address);

  return !readonly && invitedBy.data === zeroAddress ? (
    <AcceptInvitation />
  ) : (
    <DataItem
      loading={invitedBy.isLoading}
      label="Referred by"
      tooltip="The user who referred this account."
    >
      {invitedBy.data && invitedBy.data !== zeroAddress ? (
        <UserHandle
          id={invitedBy.data}
          loading={invitedBy.isLoading}
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
