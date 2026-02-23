import { DataItem } from "./DataItem";
import { UserHandle } from "../User/UserHandle";
import { Hex, zeroAddress } from "viem";
import { AcceptInvitation } from "./AcceptInvitation";
import { useProfile } from "../AccountSetup/useProfile";

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
  const profile = useProfile(
    address && address !== zeroAddress ? address : undefined,
  );

  return !readonly && address === zeroAddress && !loading ? (
    <AcceptInvitation />
  ) : (
    <DataItem
      loading={loading}
      label="Referred by"
      tooltip="The user who referred this account."
    >
      {loading || (address && address !== zeroAddress) ? (
        <UserHandle
          loading={loading}
          id={address}
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
