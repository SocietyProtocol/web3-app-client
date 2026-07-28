import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork, wagmiConfig } from "@/lib/wagmi";
import { Hex } from "viem";
import { readContract } from "@wagmi/core";

/**
 * Generates a random nonce for the user. This is used to prevent replay attacks when accepting an invitation.
 * The nonce is a 32-byte random value that is unique for each invitation acceptance attempt.
 * @returns A promise that resolves to a bigint representing the nonce.
 */
const getNonce = async () =>
  BigInt(
    "0x" +
      Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
  );

/**
 * Generates a random nonce and checks if it has been used before. If it has been used, it generates a new one until it finds an unused nonce.
 *
 * @param address
 * @param badgesContract
 * @returns A promise that resolves to a bigint representing an unused nonce.
 */
const generateUnusedNonce = async (
  address: Hex,
  badgesContract: Hex,
): Promise<bigint> => {
  while (true) {
    const nonce = await getNonce();
    const isNonceUsed = await readContract(wagmiConfig, {
      abi: SocietyProtocolBadgesABI,
      address: badgesContract,
      functionName: "usedNonces",
      args: [address, nonce],
      chainId: expectedNetwork.id,
    });

    if (!isNonceUsed) {
      return nonce;
    }
  }
};

export const useUserNonce = (address?: Hex) => {
  const badgesContract = useChainVar(contracts.badges);
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!address || !badgesContract) {
        throw new Error("Address and badges contract are required");
      }

      return generateUnusedNonce(address, badgesContract);
    },
  });

  const getFreshNonce = useCallback(async () => mutateAsync(), [mutateAsync]);

  return { getFreshNonce, isLoading: isPending };
};
