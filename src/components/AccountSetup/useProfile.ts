import { Address } from "viem";
import { useAccount } from "wagmi";
import { useProfileId } from "@/data/users/useProfileId";
import { useProfileUri } from "@/data/users/useProfileUri";
import { useMemo } from "react";
import { useFetch } from "@/hooks/useFetch";
import { useSubgraphUser } from "@/data/users/useSubgraphUser";

export interface ProfileData {
  name?: string;
  bio?: string;
  imageUrl?: string | null;
  referralCode?: string;
}

export function useProfile(addressOverride?: Address) {
  const { address } = useAccount();
  const userAddress = addressOverride || address;

  // Read profileId
  const profileIdResult = useProfileId(userAddress);

  // Read uri for the profileId (only if profileId is defined and not zero)
  const uriResult = useProfileUri(profileIdResult.data);

  // Read profile data from IPFS using the uri
  const profileDataResult = useFetch<ProfileData>(uriResult.data);

  const subgraphData = useSubgraphUser(userAddress);

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

    return undefined;
  }, [profileDataResult.data]);

  return {
    profileId: profileIdResult,
    uri: uriResult,
    profileData: profileDataResult,
    subgraphData,
    username,
    refetch,
  };
}
