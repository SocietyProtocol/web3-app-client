import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { http, watchAccount } from "@wagmi/core";
import {
  wagmiConnectionAttemptedAtom,
  wagmiReadyAtom,
} from "@/atoms/wagmiReady";
import { jotaiStore } from "./jotai";

import { env } from "@/lib/env";
import { e2ePollingOption } from "@/lib/e2e-timing";

export const isProd = env.environment === "production";

export const expectedNetwork = isProd ? mainnet : sepolia;

export const SUPPORTED_CHAINS = [expectedNetwork] as const;

export const transports = {
  [mainnet.id]: http(
    `https://eth-mainnet.g.alchemy.com/v2/${env.alchemyApiKey}`,
  ),
  [sepolia.id]: http(
    `https://eth-sepolia.g.alchemy.com/v2/${env.alchemyApiKey}`,
  ),
};

export const wagmiConfig = getDefaultConfig({
  appName: "Society Protocol",
  projectId: env.wcProjectId,
  chains: SUPPORTED_CHAINS,
  ssr: true,
  // Empty in every real deployment: wagmi keeps its own polling interval.
  ...e2ePollingOption(),
  transports: SUPPORTED_CHAINS.reduce(
    (acc, chain) => {
      acc[chain.id] = transports[chain.id];
      return acc;
    },
    {} as Record<number, ReturnType<typeof http>>,
  ),
});

/**
 * How long pages wait for wagmi's reconnect before rendering anyway.
 * reconnect() awaits every connector's provider with no timeout, so one
 * wallet that never answers would otherwise keep pages loading for good.
 */
export const WAGMI_READY_TIMEOUT_MS = 3_000;

let unwatchAccount: (() => void) | null = null;
let readyTimeout: ReturnType<typeof setTimeout> | null = null;

function markWagmiReady() {
  jotaiStore.set(wagmiReadyAtom, true);

  if (unwatchAccount) {
    unwatchAccount();
    unwatchAccount = null;
  }
  if (readyTimeout) {
    clearTimeout(readyTimeout);
    readyTimeout = null;
  }
}

/**
 * Initializes wagmi account watching to track connection state.
 * Should be called once during app initialization.
 * Automatically unwatches once wagmi is ready, or after
 * WAGMI_READY_TIMEOUT_MS if the reconnect attempt has not settled by then.
 * A saved session reconnects as "reconnecting", which counts as ready at
 * once, so the timeout only cuts short a visitor with no saved session;
 * pages read the account from wagmi and still update if a wallet connects
 * later.
 */
export function initializeWagmiWatcher() {
  if (unwatchAccount || jotaiStore.get(wagmiReadyAtom)) {
    // Already initialized
    return;
  }

  unwatchAccount = watchAccount(wagmiConfig, {
    onChange(data) {
      if (!jotaiStore.get(wagmiConnectionAttemptedAtom) && data.isConnecting) {
        jotaiStore.set(wagmiConnectionAttemptedAtom, true);
      } else if (!jotaiStore.get(wagmiReadyAtom) && !data.isConnecting) {
        markWagmiReady();
      }
    },
  });

  readyTimeout = setTimeout(markWagmiReady, WAGMI_READY_TIMEOUT_MS);
}
