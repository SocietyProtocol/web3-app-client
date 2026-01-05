import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { contracts } from "@/config/contracts";
import { http, watchAccount } from "@wagmi/core";
import {
  wagmiConnectionAttemptedAtom,
  wagmiReadyAtom,
} from "@/atoms/wagmiReady";
import { jotaiStore } from "./jotai";

export const isProd = process.env.NODE_ENV === "production";
export const SUPPORTED_CHAINS = [mainnet, sepolia] as const;

export function getExpectedNetwork() {
  return isProd ? mainnet : sepolia;
}

export function getBadgesContractAddress(chainId?: number) {
  if (chainId === sepolia.id) return contracts.sepolia.badges;
  if (chainId === mainnet.id) return contracts.mainnet.badges;
  // fallback to env
  return isProd ? contracts.mainnet.badges : contracts.sepolia.badges;
}

export const wagmiConfig = getDefaultConfig({
  appName: "Society Protocol",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: SUPPORTED_CHAINS,
  ssr: true,
  transports: {
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
  },
});

let unwatchAccount: (() => void) | null = null;

/**
 * Initializes wagmi account watching to track connection state.
 * Should be called once during app initialization.
 * Automatically unwatches once wagmi is ready.
 */
export function initializeWagmiWatcher() {
  if (unwatchAccount) {
    // Already initialized
    return;
  }

  unwatchAccount = watchAccount(wagmiConfig, {
    onChange(data) {
      if (!jotaiStore.get(wagmiConnectionAttemptedAtom) && data.isConnecting) {
        jotaiStore.set(wagmiConnectionAttemptedAtom, true);
      } else if (!jotaiStore.get(wagmiReadyAtom) && !data.isConnecting) {
        jotaiStore.set(wagmiReadyAtom, true);

        if (unwatchAccount) {
          unwatchAccount();
          unwatchAccount = null;
        }
      }
    },
  });
}
