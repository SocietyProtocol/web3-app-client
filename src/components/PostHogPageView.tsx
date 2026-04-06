"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useAccount } from "wagmi";
import { expectedNetwork } from "@/lib/wagmi";
import { capturePostHogEvent, isPostHogEnabled } from "@/lib/posthog";
import { isEqualCaseInsensitive } from "@/utils/string";

export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address, chainId, connector } = useAccount();
  const previousAddressRef = useRef<typeof address>(undefined);
  const trackedWrongNetworkChainIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isPostHogEnabled) {
      return;
    }

    if (address) {
      posthog.identify(address.toLowerCase());
      return;
    }

    posthog.reset();
  }, [address]);

  useEffect(() => {
    if (!isPostHogEnabled) {
      return;
    }

    if (
      address &&
      (!previousAddressRef.current ||
        !isEqualCaseInsensitive(previousAddressRef.current, address))
    ) {
      capturePostHogEvent("wallet_connected", {
        wallet_address: address.toLowerCase(),
        chain_id: chainId,
        connector: connector?.name,
      });
    }

    if (!address) {
      trackedWrongNetworkChainIdRef.current = undefined;
    }

    previousAddressRef.current = address;
  }, [address, chainId, connector]);

  useEffect(() => {
    if (!isPostHogEnabled || !address || chainId === undefined) {
      return;
    }

    if (chainId === expectedNetwork.id) {
      trackedWrongNetworkChainIdRef.current = undefined;
      return;
    }

    if (trackedWrongNetworkChainIdRef.current === chainId) {
      return;
    }

    capturePostHogEvent("wallet_wrong_network", {
      wallet_address: address.toLowerCase(),
      chain_id: chainId,
      expected_chain_id: expectedNetwork.id,
      expected_chain_name: expectedNetwork.name,
    });

    trackedWrongNetworkChainIdRef.current = chainId;
  }, [address, chainId]);

  useEffect(() => {
    if (!isPostHogEnabled || !pathname) {
      return;
    }

    let url = window.origin + pathname;
    if (searchParams.toString()) {
      url = url + `?${searchParams.toString()}`;
    }
    capturePostHogEvent("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
