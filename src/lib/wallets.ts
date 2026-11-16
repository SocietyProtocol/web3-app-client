import type { Wallet, WalletList } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  braveWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  phantomWallet,
  rabbyWallet,
  rainbowWallet,
  safeWallet,
  trustWallet,
  walletConnectWallet,
  zerionWallet,
} from "@rainbow-me/rainbowkit/wallets";

type CreateWallet = WalletList[number]["wallets"][number];
type WalletParams = Parameters<CreateWallet>[0];

/**
 * Whether the browser says it is a phone or tablet. The same check as
 * RainbowKit's own: on such a browser its picker lists only the wallets in
 * this file and drops every EIP-6963 announcement.
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  return (
    /android/i.test(ua) ||
    /iPhone|iPod|iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Whether the page has an injected EIP-1193 provider (window.ethereum). */
function hasWindowEthereum(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { ethereum?: unknown }).ethereum !== "undefined"
  );
}

/**
 * Whether a wallet's own provider is injected into the page. RainbowKit sets
 * `installed` from the provider's flag (isRabby, isTrust, ...) when it
 * creates the wallet; OKX does not set it, so its namespace is read instead,
 * as RainbowKit's OKX wallet does.
 */
function isInjected(wallet: Wallet): boolean {
  if (wallet.id === "okx") {
    return (
      typeof window !== "undefined" &&
      typeof (window as { okxwallet?: unknown }).okxwallet !== "undefined"
    );
  }
  return wallet.installed === true;
}

/**
 * Wallets whose in-app browser injects their own provider. Each is listed
 * only inside that browser (or with its extension installed): elsewhere it
 * would be a download link or a WalletConnect deep link, which the desktop
 * picker already covers through EIP-6963 and WalletConnect.
 */
const IN_APP_WALLETS: CreateWallet[] = [
  rabbyWallet,
  trustWallet,
  okxWallet,
  braveWallet,
  zerionWallet,
  phantomWallet,
];

function onlyWhenInjected(create: CreateWallet): CreateWallet {
  return (params: WalletParams) => {
    const wallet = create(params);
    return { ...wallet, hidden: () => !isInjected(wallet) };
  };
}

/**
 * The generic "Browser Wallet" (window.ethereum), for the in-app browser of
 * any other wallet. Only on phones and tablets: on a desktop the picker lists
 * every EIP-6963 wallet already, and this would list the same extension
 * twice. Not when one of IN_APP_WALLETS has claimed the provider, so Rabby's
 * browser shows "Rabby Wallet" and not a second entry for the same wallet.
 */
function mobileInjectedWallet(params: WalletParams): Wallet {
  return {
    ...injectedWallet(),
    hidden: () =>
      !isMobileBrowser() ||
      !hasWindowEthereum() ||
      IN_APP_WALLETS.some((create) => isInjected(create(params))),
  };
}

/**
 * The wallets the RainbowKit picker offers. The first group is RainbowKit's
 * default list (getDefaultConfig without `wallets`), in the same order:
 * Safe connects only inside the Safe app's iframe, MetaMask, Base and
 * Rainbow fall back to their mobile apps, WalletConnect covers the rest.
 *
 * On a phone RainbowKit drops EIP-6963 wallets, so a member inside Rabby,
 * Trust, OKX, Brave, Zerion or Phantom's own browser had no option for that
 * wallet (tapping MetaMask tried a metamask:// deep link instead). The
 * second group lists the injected wallet there.
 */
export const walletList: WalletList = [
  {
    groupName: "Popular",
    wallets: [
      safeWallet,
      rainbowWallet,
      baseAccount,
      metaMaskWallet,
      walletConnectWallet,
    ],
  },
  {
    groupName: "Installed",
    wallets: [...IN_APP_WALLETS.map(onlyWhenInjected), mobileInjectedWallet],
  },
];
