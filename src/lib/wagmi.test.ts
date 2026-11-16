import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AccountChange = { isConnecting: boolean };

const mocks = vi.hoisted(() => ({
  onChange: undefined as ((data: AccountChange) => void) | undefined,
  unwatch: vi.fn(),
  watchAccount: vi.fn(),
  /** wagmi's storage: what `recentConnectorId` holds, or a read that fails. */
  getItem: vi.fn(),
}));

vi.mock("@rainbow-me/rainbowkit", () => ({
  getDefaultConfig: () => ({ storage: { getItem: mocks.getItem } }),
}));
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
    mocks.getItem.mockReset();
    mocks.getItem.mockResolvedValue(null);
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
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is ready at once when the attempt starts as reconnecting", async () => {
    const { initializeWagmiWatcher, ready } = await load();
    initializeWagmiWatcher();

    mocks.onChange?.({ isConnecting: false });
    expect(ready()).toBe(true);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops waiting when a connector never answers", async () => {
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    mocks.onChange?.(connecting);

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS - 1);
    expect(ready()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(ready()).toBe(true);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
    expect(mocks.getItem).toHaveBeenCalledWith("recentConnectorId");
  });

  it("waits longer for a browser that has connected a wallet before", async () => {
    mocks.getItem.mockResolvedValue("io.metamask");
    const {
      initializeWagmiWatcher,
      ready,
      WAGMI_READY_TIMEOUT_MS,
      WAGMI_RECONNECT_TIMEOUT_MS,
    } = await load();
    initializeWagmiWatcher();
    mocks.onChange?.(connecting);

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS);
    expect(ready()).toBe(false);
    expect(mocks.unwatch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(
      WAGMI_RECONNECT_TIMEOUT_MS - WAGMI_READY_TIMEOUT_MS - 1,
    );
    expect(ready()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(ready()).toBe(true);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a returning member whose wallet answers late is ready then, not at the fallback", async () => {
    mocks.getItem.mockResolvedValue("io.metamask");
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    mocks.onChange?.(connecting);

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS + 2_000);
    expect(ready()).toBe(false);

    mocks.onChange?.({ isConnecting: false });
    expect(ready()).toBe(true);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("treats a storage read that fails as a browser that never connected", async () => {
    mocks.getItem.mockRejectedValue(new Error("SecurityError"));
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    mocks.onChange?.(connecting);

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS);
    expect(ready()).toBe(true);
  });

  it("does not wait on when the attempt settles while storage is read", async () => {
    let answer!: (value: string) => void;
    mocks.getItem.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    mocks.onChange?.(connecting);

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS);
    mocks.onChange?.({ isConnecting: false });
    expect(ready()).toBe(true);

    answer("io.metamask");
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.unwatch).toHaveBeenCalledTimes(1);
  });

  it("stops waiting when the attempt ended before it subscribed", async () => {
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS);
    expect(ready()).toBe(true);
  });

  it("subscribes once however often it is called", async () => {
    const { initializeWagmiWatcher, ready, WAGMI_READY_TIMEOUT_MS } =
      await load();
    initializeWagmiWatcher();
    initializeWagmiWatcher();
    expect(mocks.watchAccount).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(WAGMI_READY_TIMEOUT_MS);
    expect(ready()).toBe(true);

    // Once ready, it neither watches again nor starts another timer.
    initializeWagmiWatcher();
    expect(mocks.watchAccount).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
