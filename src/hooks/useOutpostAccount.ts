"use client";

import { useAccount } from "wagmi";
import { lightAccountAddress } from "@/lib/smart-account";

/**
 * The connected wallet is the key. The address is its Light Account.
 */
export function useOutpostAccount() {
  const account = useAccount();
  const ownerAddress = account.address;
  const address = ownerAddress ? lightAccountAddress(ownerAddress) : undefined;

  return {
    ...account,
    address,
    ownerAddress,
    smartAccountsEnabled: true,
  };
}
