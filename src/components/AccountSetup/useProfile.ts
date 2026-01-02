import { Hex } from "viem";
import { useAccount } from "wagmi";
import { useIpfsJson } from "@/hooks/useIpfsJson";
import { useProfileId } from "@/hooks/useProfileId";
import { useProfileUri } from "@/hooks/useProfileUri";

export interface ProfileData {
  name?: string;
  bio?: string;
  avatar?: string | null;
  referralCode?: string;
}

export function useProfile(addressOverride?: Hex) {
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

  return {
    profileId: profileIdResult,
    uri: uriResult,
    profileData: profileDataResult,
    refetch,
  };
}
