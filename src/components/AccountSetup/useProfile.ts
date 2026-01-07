import { Address } from "viem";
import { useAccount } from "wagmi";
import { useIpfsJson } from "@/hooks/useIpfsJson";
import { useProfileId } from "@/hooks/useProfileId";
import { useProfileUri } from "@/hooks/useProfileUri";
import { useMemo } from "react";

export interface ProfileData {
  name?: string;
  bio?: string;
  avatar?: string | null;
  referralCode?: string;
}

export function useProfile(addressOverride?: Address) {
  const { address } = useAccount();
  const userAddress = addressOverride || address;

  // Read profileId
  const profileIdResult = useProfileId(userAddress);

  // Read uri for the profileId (only if profileId is defined and not zero)
  const uriResult = useProfileUri(profileIdResult.data);

  // Use the new IPFS hook
  const profileDataResult = useIpfsJson<ProfileData>(uriResult.data);

  const refetch = async () => {
    await profileIdResult.refetch();
    await uriResult.refetch();
    await profileDataResult.refetch();
  };

  const username = useMemo(() => {
    if (
      profileDataResult.data?.name &&
      profileDataResult.data.name.trim() !== ""
    ) {
      return profileDataResult.data.name;
    }
    if (profileIdResult.data) {
      return `User #${profileIdResult.data}`;
    }
    return undefined;
  }, [profileDataResult.data, profileIdResult.data]);

  return {
    profileId: profileIdResult,
    uri: uriResult,
    profileData: profileDataResult,
    username,
    refetch,
  };
}
