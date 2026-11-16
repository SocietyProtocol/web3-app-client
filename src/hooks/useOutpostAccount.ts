"use client";

import { useAccount, useBytecode, useChainId } from "wagmi";
import { lightAccountAddress } from "@/lib/smart-account";
import { outpostIdentity } from "@/lib/outpost-routing";

/**
 * The connected wallet is the key. For an EOA, the address is its Light
 * Account. A contract wallet (Safe, smart wallet) is its own identity.
 * address stays undefined while the wallet's code is being read.
 */
export function useOutpostAccount() {
  const account = useAccount();
  const chainId = useChainId();
  const ownerAddress = account.address;
  const code = useBytecode({
    address: ownerAddress,
    chainId,
    query: { enabled: !!ownerAddress, staleTime: Infinity },
  });

  const identity = outpostIdentity({
    owner: ownerAddress,
    smartAccount: ownerAddress ? lightAccountAddress(ownerAddress) : undefined,
    code: code.data,
    // A failed read falls back to the Light Account, as before.
    codeLoading: !!ownerAddress && code.isPending && !code.isError,
    connectorId: account.connector?.id,
  });

  return {
    ...account,
    address: identity.address,
    ownerAddress,
    isSmartAccount: identity.isSmartAccount,
    isContractWallet: identity.isContractWallet,
    isLoading: identity.isLoading,
    smartAccountsEnabled: true,
  };
}
