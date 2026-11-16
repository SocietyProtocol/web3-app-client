import { afterEach, describe, expect, it, vi } from "vitest";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { isMobileBrowser, walletList } from "@/lib/wallets";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const params = {
  projectId: "test-project",
  appName: "Society Protocol",
  walletConnectParameters: {},
  options: {},
} as Parameters<(typeof walletList)[number]["wallets"][number]>[0];

/** A browser with this user agent and these globals (window.ethereum, window.okxwallet, ...). */
function browser(userAgent: string, globals: Record<string, unknown> = {}) {
  vi.stubGlobal("navigator", { userAgent, platform: "", maxTouchPoints: 0 });
  const win: Record<string, unknown> = { ...globals, location: { origin: "https://app.test" } };
  // Not inside an iframe: RainbowKit's Safe wallet compares window.parent.
  win.parent = win;
  vi.stubGlobal("window", win);
}

/** The ids of the wallets the picker would list, in order. */
function visibleWalletIds(): string[] {
  return walletList
    .flatMap((group) => group.wallets)
    .map((create) => create(params))
    .filter((wallet) => !wallet.hidden?.())
    .map((wallet) => wallet.id);
}

const DEFAULT_IDS = ["safe", "rainbow", "base", "metaMask", "walletConnect"];

describe("walletList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps RainbowKit's default wallets first, in the same order", () => {
    browser(DESKTOP);
    const popular = walletList[0].wallets.map((create) => create(params).id);
    expect(popular).toEqual(DEFAULT_IDS);
  });

  it("adds nothing on a desktop with a MetaMask-like extension (EIP-6963 covers it)", () => {
    browser(DESKTOP, { ethereum: { isMetaMask: true, request: vi.fn() } });
    expect(visibleWalletIds()).toEqual(DEFAULT_IDS);
  });

  it("adds nothing on a phone without an injected provider", () => {
    browser(IPHONE);
    expect(visibleWalletIds()).toEqual(DEFAULT_IDS);
  });

  it("lists the generic injected wallet in an unknown wallet's in-app browser", () => {
    browser(ANDROID, { ethereum: { request: vi.fn() } });
    expect(visibleWalletIds()).toEqual([...DEFAULT_IDS, "injected"]);
  });

  it.each([
    ["rabby", { ethereum: { isRabby: true, isMetaMask: true, request: vi.fn() } }],
    ["trust", { ethereum: { isTrust: true, request: vi.fn() } }],
    ["okx", { ethereum: { request: vi.fn() }, okxwallet: { request: vi.fn() } }],
    ["brave", { ethereum: { isBraveWallet: true, request: vi.fn() } }],
    ["zerion", { ethereum: { isZerion: true, request: vi.fn() } }],
    ["phantom", { ethereum: { request: vi.fn() }, phantom: { ethereum: { request: vi.fn() } } }],
  ])("lists %s, and not a second generic entry, inside its in-app browser on a phone", (id, globals) => {
    browser(IPHONE, globals);
    expect(visibleWalletIds()).toEqual([...DEFAULT_IDS, id]);
  });

  it("builds connectors with RainbowKit for an iPhone inside Rabby", () => {
    browser(IPHONE, { ethereum: { isRabby: true, request: vi.fn() } });
    const connectors = connectorsForWallets(walletList, {
      projectId: "test-project",
      appName: "Society Protocol",
    });
    // Five defaults and Rabby, plus the WalletConnect modal connector
    // RainbowKit adds next to the WalletConnect wallet.
    expect(connectors).toHaveLength(DEFAULT_IDS.length + 1 + 1);
  });
});

describe("isMobileBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [IPHONE, true],
    [ANDROID, true],
    [DESKTOP, false],
  ])("%s -> %s", (userAgent, expected) => {
    vi.stubGlobal("navigator", { userAgent, platform: "", maxTouchPoints: 0 });
    expect(isMobileBrowser()).toBe(expected);
  });

  it("treats an iPad that reports a Mac as mobile, like RainbowKit", () => {
    vi.stubGlobal("navigator", { userAgent: DESKTOP, platform: "MacIntel", maxTouchPoints: 5 });
    expect(isMobileBrowser()).toBe(true);
  });
});
