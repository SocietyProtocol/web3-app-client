import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { http, watchAccount } from "@wagmi/core";
import {
  wagmiConnectionAttemptedAtom,
  wagmiReadyAtom,
} from "@/atoms/wagmiReady";
import { jotaiStore } from "./jotai";

import { env } from "@/lib/env";

export const isProd = env.environment === "production";

export const SUPPORTED_CHAINS = [mainnet, sepolia] as const;

export const expectedNetwork = isProd ? mainnet : sepolia;

export const wagmiConfig = getDefaultConfig({
  appName: "Society Protocol",
  projectId: env.wcProjectId,
  chains: SUPPORTED_CHAINS,
  ssr: true,
  transports: {
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${env.alchemyApiKey}`,
    ),
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${env.alchemyApiKey}`,
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
