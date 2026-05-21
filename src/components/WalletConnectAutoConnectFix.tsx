"use client";

import { useEffect } from "react";
import { useConfig } from "wagmi";
import type { Config } from "wagmi";
import type { Address } from "viem";

type WagmiConfigInternal = Config & {
  _internal: {
    events: {
      change: (data: {
        uid: string;
        accounts?: readonly Address[];
        chainId?: number;
      }) => void;
      connect: (data: unknown) => void;
      disconnect: (data: { uid: string }) => void;
    };
  };
};

type ConnectEventPayload = {
  accounts: readonly Address[];
  chainId: number;
};

type Eip1193Provider = {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

/**
 * WalletConnect modal stays open after wallet approval because of a chain of
 * upstream bugs:
 *
 *   1) `@walletconnect/ethereum-provider` emits `connect` (with accounts and
 *      chainId) after the wallet approves, but the promise awaited by wagmi's
 *      `connect()` action never resolves.
 *   2) wagmi's internal `connect` handler ignores the emitter event because of
 *      its `if (status === 'connecting') return` guard.
 *   3) Because the action's promise never resolves, the connector never
 *      reaches the code that subscribes to provider events
 *      (`chainChanged`, `accountsChanged`, `disconnect`, `session_delete`).
 *      As a result, wallet-side network changes don't propagate to wagmi.
 *
 * This component fixes both:
 *
 *   a) On the connector's `connect` emitter event, optimistically write
 *      `status: 'connected'` so the modal closes.
 *   b) Wire up the wagmi-side `change`/`disconnect` handlers on the connector
 *      emitter (the action would have done this).
 *   c) Subscribe directly to the underlying EIP-1193 provider's
 *      `chainChanged`/`accountsChanged`/`disconnect` events and forward them
 *      to the connector emitter, so subsequent wallet-side changes propagate.
 *
 * Calling `reconnect()` here was tried and reliably causes the WalletConnect
 * session to drop the moment the wallet later changes networks, so we avoid
 * it and replicate only the listener setup that the connector's connect()
 * never reached.
 */
export function WalletConnectAutoConnectFix() {
  const config = useConfig();

  useEffect(() => {
    const wcConnector = config.connectors.find(
      (c) => c.id === "walletConnect",
    );
    if (!wcConnector) return;

    let cleanupProviderListeners: () => void = () => {};

    const handler = async (payload: ConnectEventPayload) => {
      if (config.state.status !== "connecting") return;
      if (!payload?.accounts || payload.accounts.length === 0) return;

      const internal = (config as WagmiConfigInternal)._internal;

      // (b) wire up the wagmi-side listeners on the connector emitter
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
        // best effort
      }

      // (a) close the modal by writing connected state
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

      // (c) attach provider listeners that the connector's connect() never
      //     reached, so wallet-side chain/accounts/disconnect events propagate.
      try {
        const provider = (await wcConnector.getProvider()) as Eip1193Provider;

        const onChainChanged = (chainIdHexOrNumber: unknown) => {
          const chainId =
            typeof chainIdHexOrNumber === "string"
              ? Number.parseInt(chainIdHexOrNumber, 16)
              : Number(chainIdHexOrNumber);
          if (!Number.isFinite(chainId)) return;
          wcConnector.emitter.emit("change", { chainId });
        };
        const onAccountsChanged = (accounts: unknown) => {
          if (!Array.isArray(accounts)) return;
          wcConnector.emitter.emit("change", {
            accounts: accounts as readonly Address[],
          });
        };
        const onProviderDisconnect = () => {
          wcConnector.emitter.emit("disconnect");
        };

        provider.on?.("chainChanged", onChainChanged);
        provider.on?.("accountsChanged", onAccountsChanged);
        provider.on?.("disconnect", onProviderDisconnect);

        cleanupProviderListeners = () => {
          provider.removeListener?.("chainChanged", onChainChanged);
          provider.removeListener?.("accountsChanged", onAccountsChanged);
          provider.removeListener?.("disconnect", onProviderDisconnect);
        };
      } catch {
        // provider not yet available; without listeners the user will have to
        // refresh after switching chains in the wallet, but at least the
        // initial connection succeeded.
      }
    };

    wcConnector.emitter.on("connect", handler);
    return () => {
      wcConnector.emitter.off("connect", handler);
      cleanupProviderListeners();
    };
  }, [config]);

  return null;
}
