"use client";

import { useMemo } from "react";
import { useChainId } from "wagmi";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { identityAddresses } from "./accountIdentity";
import {
  legacyOwnerOf,
  legacySocietyAddress,
  resolveRecipient,
  resolveRecipients,
} from "./legacyAccounts";

/** Legacy map lookups bound to the current chain. */
export const useLegacyAccounts = () => {
  const chainId = useChainId();

  return useMemo(
    () => ({
      chainId,
      societyAddressOf: (eoa?: string) => legacySocietyAddress(eoa, chainId),
      ownerOf: (societyAddress?: string) =>
        legacyOwnerOf(societyAddress, chainId),
      resolveRecipient: (input: string) => resolveRecipient(input, chainId),
      resolveRecipients: (inputs: string[]) =>
        resolveRecipients(inputs, chainId),
    }),
    [chainId],
  );
};

/** The connected member's Society address and wallet, de-duplicated. */
export const useIdentityAddresses = () => {
  const { address, ownerAddress } = useOutpostAccount();
  return useMemo(
    () => identityAddresses(address, ownerAddress),
    [address, ownerAddress],
  );
};
