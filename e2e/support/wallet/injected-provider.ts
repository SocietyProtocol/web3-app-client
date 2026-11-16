/**
 * The page side of the test wallet. Playwright serialises this function and
 * runs it in every page before any app script, so it must be self-contained:
 * no imports and no references to anything outside its own body.
 *
 * It defines window.ethereum as a thin EIP-1193 provider and announces it
 * through EIP-6963. Every request goes to Node through the
 * `__e2eWalletRequest` binding; the page never holds a key.
 */
export type InjectedProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  /** Sets window.ethereum.isMetaMask, which RainbowKit's built-in MetaMask option looks for. */
  isMetaMask: boolean;
  /** Further flags set on window.ethereum, such as isRabby, which RainbowKit's wallet entries look for. */
  flags?: Record<string, boolean>;
};

export function injectedProvider(info: InjectedProviderInfo) {
  type Listener = (...args: unknown[]) => void;
  const listeners = new Map<string, Set<Listener>>();
  const bridge = (
    window as unknown as {
      __e2eWalletRequest: (request: { method: string; params?: unknown }) => Promise<{
        result?: unknown;
        error?: { code: number; message: string; data?: unknown };
      }>;
    }
  ).__e2eWalletRequest;
  let connected = true;

  const provider = {
    ...info.flags,
    isMetaMask: info.isMetaMask,
    isE2ETestWallet: true,
    _events: {},
    _state: {},
    async request({ method, params }: { method: string; params?: unknown }) {
      const response = await bridge({ method, params });
      if (response.error) {
        const error = new Error(response.error.message) as Error & {
          code?: number;
          data?: unknown;
        };
        error.code = response.error.code;
        error.data = response.error.data;
        throw error;
      }
      return response.result;
    },
    enable() {
      return provider.request({ method: "eth_requestAccounts" });
    },
    /** EIP-1193: whether the provider can reach the chain, not whether an account is exposed. */
    isConnected() {
      return connected;
    },
    on(event: string, listener: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return provider;
    },
    once(event: string, listener: Listener) {
      const wrapped: Listener = (...args) => {
        provider.removeListener(event, wrapped);
        listener(...args);
      };
      return provider.on(event, wrapped);
    },
    removeListener(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
      return provider;
    },
    off(event: string, listener: Listener) {
      return provider.removeListener(event, listener);
    },
    addListener(event: string, listener: Listener) {
      return provider.on(event, listener);
    },
    removeAllListeners(event?: string) {
      if (event) listeners.delete(event);
      else listeners.clear();
      return provider;
    },
    emit(event: string, ...args: unknown[]) {
      if (event === "connect") connected = true;
      if (event === "disconnect") connected = false;
      for (const listener of Array.from(listeners.get(event) ?? [])) {
        try {
          listener(...args);
        } catch (error) {
          console.error("[e2e wallet] listener failed", error);
        }
      }
      return true;
    },
  };

  Object.defineProperty(window, "ethereum", {
    value: provider,
    configurable: true,
    writable: true,
  });
  (window as unknown as { __e2eWallet: unknown }).__e2eWallet = {
    emit: (event: string, data: unknown) => provider.emit(event, data),
  };

  const announce = () =>
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({
          info: Object.freeze({ uuid: info.uuid, name: info.name, icon: info.icon, rdns: info.rdns }),
          provider,
        }),
      }),
    );
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
}
