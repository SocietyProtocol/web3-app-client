import { Address } from "viem";
import { useAccount } from "wagmi";
import { useProfileId } from "@/data/users/useProfileId";
import { useProfileUri } from "@/data/users/useProfileUri";
import { useSubgraphUser } from "@/data/users/useSubgraphUser";
import { truncateAddress } from "@/utils/string";

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

  const subgraphData = useSubgraphUser(userAddress);

  const refetch = async () => {
    await profileIdResult.refetch();
    await uriResult.refetch();
  };

  return {
    profileId: profileIdResult,
    uri: uriResult,
    subgraphData,
    username:
      subgraphData.data?.name ||
      (userAddress ? truncateAddress(userAddress) : "Unknown User"),
    refetch,
    isInitialLoading:
      (profileIdResult.data === undefined && profileIdResult.isLoading) ||
      (uriResult.data === undefined && uriResult.isLoading),
  };
}
