import { useCallback } from "react";
import { useSignTypedData } from "wagmi";
import { type Address, type Hex } from "viem";
import { generateReferralCode } from "@/utils/referralCode";
import { SECONDS_PER_DAY_BN } from "@/consts/time";
import { useDomainData } from "./useDomainData";
import { useUserNonce } from "./useUserNonce";

const REFERRAL_CODE_EXPIRY_SECONDS = SECONDS_PER_DAY_BN; // 24 hours

const REFERRAL_EIP712_TYPES = {
  Invite: [
    { name: "inviter", type: "address" },
    { name: "invitee", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export const useGenerateReferralCode = (inviter?: Address) => {
  const { data: domainData, isLoading: isDomainLoading } = useDomainData();
  const { getFreshNonce, isLoading: isNonceLoading } = useUserNonce(inviter);
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();

  const isReady =
    !!domainData && !!inviter && !isDomainLoading && !isNonceLoading;

  const generate = useCallback(
    async (
      invitee: Hex,
    ): Promise<{
      address: Hex;
      code: Hex;
      expiry: number;
    }> => {
      if (!inviter || !domainData) {
        throw new Error("Not ready to generate referral code");
      }

      const nonce = await getFreshNonce();

      // eip712Domain returns: [fields, name, version, chainId, verifyingContract, salt, extensions]
      const [, name, version, chainId, verifyingContract] = domainData;

      const expiry =
        BigInt(Math.floor(Date.now() / 1000)) + REFERRAL_CODE_EXPIRY_SECONDS;

      const signature = await signTypedDataAsync({
        domain: {
          name,
          version,
          chainId: Number(chainId),
          verifyingContract,
        },
        types: REFERRAL_EIP712_TYPES,
        primaryType: "Invite",
        message: {
          inviter: inviter.toLowerCase() as Hex,
          invitee: invitee.toLowerCase() as Hex,
          nonce,
          expiry,
        },
      });

      const referralCode = generateReferralCode(
        signature,
        inviter as Hex,
        nonce,
        expiry,
      );

      return {
        address: invitee,
        code: referralCode,
        expiry: Number(expiry),
      };
    },
    [inviter, domainData, getFreshNonce, signTypedDataAsync],
  );

  return {
    generate,
    isSigning,
    isReady,
    isLoading: isDomainLoading || isNonceLoading,
  };
};
