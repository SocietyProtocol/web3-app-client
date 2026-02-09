import { useInvitedBy } from "./useInvitedBy";
import { DataItem } from "./DataItem";
import { UserHandle } from "../User/UserHandle";
import { Hex, zeroAddress } from "viem";
import { AcceptInvitation } from "./AcceptInvitation";
import { useProfile } from "../AccountSetup/useProfile";

interface ReferredByProps {
  readonly?: boolean;
  address?: Hex;
}

export const ReferredBy = ({ readonly = false, address }: ReferredByProps) => {
  const invitedBy = useInvitedBy(address);

  const profile = useProfile(
    invitedBy.data && invitedBy.data !== zeroAddress
      ? invitedBy.data
      : undefined,
  );

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
          loading={invitedBy.isLoading}
          id={invitedBy.data}
          name={profile.username}
          bio={profile.profileData.data?.bio}
          imageUrl={profile.profileData.data?.imageUrl}
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
