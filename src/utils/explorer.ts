import { Hex } from "viem";
import { mainnet, sepolia } from "wagmi/chains";
import { URLS } from "@/config/const";

type ExplorerLinkParams = { tx: Hex } | { address: Hex };

/**
 * Creates a function that builds explorer links for a specific chain.
 *
 * @param chainId - The chain ID to build explorer links for
 * @returns A function that takes either a transaction hash or address and returns the explorer URL
 *
 * @example
 * const buildLink = getExplorerLinkBuilder(1);
 * const txUrl = buildLink({ tx: "0x..." });
 * const addressUrl = buildLink({ address: "0x..." });
 */
export function getExplorerLinkBuilder(chainId?: number) {
  const getBaseUrl = () => {
    if (chainId === sepolia.id) return URLS.ETHERSCAN_SEPOLIA;
    if (chainId === mainnet.id) return URLS.ETHERSCAN_MAINNET;
    return URLS.ETHERSCAN_MAINNET; // fallback
  };

  return (params: ExplorerLinkParams): string => {
    const baseUrl = getBaseUrl();

    if ("tx" in params) {
      return `${baseUrl}/tx/${params.tx}`;
    }

    return `${baseUrl}/address/${params.address}`;
  };
}
