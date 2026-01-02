import { generateAuthMessage } from "@/lib/auth";
import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";

export interface AuthPayload {
  address: string;
  message: string;
  signature: `0x${string}`;
  timestamp: number;
}

/**
 * Hook for generating authentication payload
 */
export function useAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const generateAuthPayload =
    useCallback(async (): Promise<AuthPayload | null> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const timestamp = Date.now();
      const message = generateAuthMessage(address, timestamp);

      const signature = await signMessageAsync({ message });

      return {
        address,
        message,
        signature,
        timestamp,
      };
    }, [address, signMessageAsync]);

  return { generateAuthPayload, address };
}
