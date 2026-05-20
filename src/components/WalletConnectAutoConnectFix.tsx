"use client";

import { useEffect } from "react";
import { useConfig } from "wagmi";
import type { Config } from "wagmi";
import type { Address } from "viem";

type WagmiConfigInternal = Config & {
  _internal: {
    events: {
      change: (...args: unknown[]) => void;
      connect: (...args: unknown[]) => void;
      disconnect: (...args: unknown[]) => void;
    };
  };
};

type ConnectEventPayload = {
  accounts: readonly Address[];
  chainId: number;
};

/**
 * Workaround for a WalletConnect flow where the `@walletconnect/ethereum-provider`
 * provider emits `connect` (with accounts and chainId) but never resolves the
 * promise awaited by wagmi's `connect()` action. The internal handler ignores
 * the event because `status === 'connecting'`, so wagmi stays stuck in
 * `connecting` and the RainbowKit modal never closes.
 *
 * This listens to the connector's `connect` emitter and, when the store is
 * stuck in `connecting` with accounts already delivered, replicates the state
 * transition that the action would have performed on a successful resolve.
 */
export function WalletConnectAutoConnectFix() {
  const config = useConfig();

  useEffect(() => {
    const wcConnector = config.connectors.find((c) => c.id === "walletConnect");
    if (!wcConnector) return;

    const handler = async (payload: ConnectEventPayload) => {
      if (config.state.status !== "connecting") return;
      if (!payload?.accounts || payload.accounts.length === 0) return;

      const internal = (config as WagmiConfigInternal)._internal;

      wcConnector.emitter.off("connect", internal.events.connect);
      if (!wcConnector.emitter.listenerCount("change")) {
        wcConnector.emitter.on("change", internal.events.change);
      }
      if (!wcConnector.emitter.listenerCount("disconnect")) {
        wcConnector.emitter.on("disconnect", internal.events.disconnect);
      }

      try {
        await config.storage?.setItem("recentConnectorId", wcConnector.id);
      } catch {
        // best effort; storage may be unavailable
      }

      config.setState((x) => ({
        ...x,
        connections: new Map(x.connections).set(wcConnector.uid, {
          accounts: payload.accounts as readonly [Address, ...Address[]],
          chainId: payload.chainId,
          connector: wcConnector,
        }),
        current: wcConnector.uid,
        status: "connected",
      }));
    };

    wcConnector.emitter.on("connect", handler);
    return () => {
      wcConnector.emitter.off("connect", handler);
    };
  }, [config]);

  return null;
}
