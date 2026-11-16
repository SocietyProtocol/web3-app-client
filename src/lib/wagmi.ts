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
 * How long pages wait for wagmi's reconnect before rendering anyway, for a
 * browser that has never connected a wallet here. reconnect() awaits every
 * connector with no timeout (the injected connector asks eth_accounts and
 * waits for the answer), so one wallet that never answers would otherwise
 * keep pages loading for good.
 */
export const WAGMI_READY_TIMEOUT_MS = 3_000;

/**
 * The same wait, in all, for a browser that has connected a wallet here
 * before. With `ssr: true` wagmi does not restore the saved connection
 * before it reconnects, so a returning member goes through "connecting"
 * like a visitor; rendering after 3 s would show them as logged out while
 * their wallet is merely slow to answer. They wait longer instead.
 */
export const WAGMI_RECONNECT_TIMEOUT_MS = 15_000;

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
 * Whether a wallet was ever connected in this browser: wagmi keeps the
 * connector's id, also after a disconnect, so someone who disconnected
 * waits the longer time too if their wallet hangs.
 */
async function hasConnectedBefore(): Promise<boolean> {
  try {
    return Boolean(await wagmiConfig.storage?.getItem("recentConnectorId"));
  } catch {
    return false;
  }
}

/** The short wait is over: render, unless this browser has connected before. */
async function onReadyTimeout() {
  readyTimeout = null;
  if (jotaiStore.get(wagmiReadyAtom)) return;
  if (!(await hasConnectedBefore())) {
    markWagmiReady();
    return;
  }
  // The reconnect may have settled while storage was read.
  if (jotaiStore.get(wagmiReadyAtom)) return;
  readyTimeout = setTimeout(
    markWagmiReady,
    WAGMI_RECONNECT_TIMEOUT_MS - WAGMI_READY_TIMEOUT_MS,
  );
}

/**
 * Initializes wagmi account watching to track connection state.
 * Should be called once during app initialization.
 * Automatically unwatches once wagmi is ready, or once the reconnect
 * attempt has not settled after WAGMI_READY_TIMEOUT_MS (a browser that has
 * never connected a wallet here) or WAGMI_RECONNECT_TIMEOUT_MS (one that
 * has). Pages read the account from wagmi and still update if a wallet
 * connects later.
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

  readyTimeout = setTimeout(
    () => void onReadyTimeout(),
    WAGMI_READY_TIMEOUT_MS,
  );
}
