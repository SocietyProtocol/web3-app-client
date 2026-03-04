import { useMemo } from "react";
import { getExplorerLinkBuilder } from "@/utils/explorer";
import { expectedNetwork } from "@/lib/wagmi";

/**
 * Hook that returns a function to build explorer links for the current chain.
 *
 * @returns A function that takes either a transaction hash or address and returns the explorer URL
 *
 * @example
 * const buildLink = useExplorerLinkBuilder();
 * const txUrl = buildLink({ tx: "0x..." });
 * const addressUrl = buildLink({ address: "0x..." });
 */
export function useExplorerLinkBuilder() {
  return useMemo(() => getExplorerLinkBuilder(expectedNetwork.id), []);
}
