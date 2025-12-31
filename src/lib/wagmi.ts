import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { contracts } from "@/config/contracts";
import { watchAccount } from "@wagmi/core";
import {
  wagmiConnectionAttemptedAtom,
  wagmiReadyAtom,
} from "@/atoms/wagmiReady";
import { jotaiStore } from "./jotai";

export const isDev = process.env.NODE_ENV === "development";
export const SUPPORTED_CHAINS = [mainnet, sepolia] as const;

export function getExpectedNetwork() {
  return isDev ? sepolia : mainnet;
}

export function getBadgesContractAddress(chainId?: number) {
  if (chainId === sepolia.id) return contracts.sepolia.badges;
  if (chainId === mainnet.id) return contracts.mainnet.badges;
  // fallback to env
  return isDev ? contracts.sepolia.badges : contracts.mainnet.badges;
}

export const wagmiConfig = getDefaultConfig({
  appName: "Society Protocol",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: SUPPORTED_CHAINS,
  ssr: true,
});

export const unwatch = watchAccount(wagmiConfig, {
  onChange(data) {
    if (!jotaiStore.get(wagmiConnectionAttemptedAtom) && data.isConnecting) {
      jotaiStore.set(wagmiConnectionAttemptedAtom, true);
    } else if (!jotaiStore.get(wagmiReadyAtom) && !data.isConnecting) {
      jotaiStore.set(wagmiReadyAtom, true);
      unwatch();
    }
  },
});
