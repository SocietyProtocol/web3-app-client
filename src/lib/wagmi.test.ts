import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AccountChange = { isConnecting: boolean };

const mocks = vi.hoisted(() => ({
  onChange: undefined as ((data: AccountChange) => void) | undefined,
  unwatch: vi.fn(),
  watchAccount: vi.fn(),
}));

vi.mock("@rainbow-me/rainbowkit", () => ({ getDefaultConfig: () => ({}) }));
vi.mock("@wagmi/core", () => ({
  http: () => ({}),
  watchAccount: mocks.watchAccount,
}));
vi.mock("@/lib/env", () => ({
  env: { environment: "staging", alchemyApiKey: "", wcProjectId: "" },
}));

/** A fresh module, so its watcher state and the jotai store start empty. */
async function load() {
  vi.resetModules();
  const wagmi = await import("@/lib/wagmi");
  const { jotaiStore } = await import("@/lib/jotai");
  const { wagmiReadyAtom } = await import("@/atoms/wagmiReady");
  return {
    ...wagmi,
    ready: () => jotaiStore.get(wagmiReadyAtom),
  };
}

const connecting = { isConnecting: true };
const disconnected = { isConnecting: false };

describe("initializeWagmiWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.onChange = undefined;
    mocks.unwatch.mockReset();
    mocks.watchAccount.mockReset();
    mocks.watchAccount.mockImplementation(
      (_config, { onChange }: { onChange: (data: AccountChange) => void }) => {
        mocks.onChange = onChange;
        return mocks.unwatch;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is ready once the reconnect attempt settles", async () => {
    const { initializeWagmiWatcher, ready } = await load();
    initializeWagmiWatcher();

    mocks.onChange?.(connecting);
    expect(ready()).toBe(false);

    mocks.onChange?.(disconnected);
    expect(ready()).toBe(true);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);

    // The fallback was cleared with the watcher.
    vi.runAllTimers();
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
  });

  it("is ready at once for a saved session that is reconnecting", async () => {
    const { initializeWagmiWatcher, ready } = await load();
    initializeWagmiWatcher();

    mocks.onChange?.({ isConnecting: false });
    expect(ready()).toBe(true);
  });

  it("stops waiting when a connector never answers", async () => {
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    mocks.onChange?.(connecting);

    vi.advanceTimersByTime(WAGMI_READY_TIMEOUT_MS - 1);
    expect(ready()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(ready()).toBe(true);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
  });

  it("stops waiting when the attempt ended before it subscribed", async () => {
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();

    vi.advanceTimersByTime(WAGMI_READY_TIMEOUT_MS);
    expect(ready()).toBe(true);
  });

  it("subscribes once however often it is called", async () => {
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    initializeWagmiWatcher();
    expect(mocks.watchAccount).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(WAGMI_READY_TIMEOUT_MS);
    expect(ready()).toBe(true);

    // Once ready, it neither watches again nor starts another timer.
    initializeWagmiWatcher();
    expect(mocks.watchAccount).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
