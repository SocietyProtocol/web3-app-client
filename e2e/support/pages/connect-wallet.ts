import type { Locator, Page } from "@playwright/test";

/** What the header's account button is called while the wallet is on another network. */
export const WRONG_NETWORK_LABEL = "Wrong network — click to switch";

/** An address as the app shortens it: "0x1234...abcdef" (src/utils/string.ts, six characters each side). */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/** Matches text that contains the shortened address, whatever its letter case. */
export function shortAddressPattern(address: string): RegExp {
  return new RegExp(shortAddress(address).replace(/\./g, "\\."), "i");
}

/** Matches text that is the shortened address and nothing else. */
export function onlyShortAddress(address: string): RegExp {
  return new RegExp(`^${shortAddress(address).replace(/\./g, "\\.")}$`, "i");
}

/** Matches the address in full, whatever its letter case. */
export function fullAddress(address: string): RegExp {
  return new RegExp(`^${address}$`, "i");
}

/**
 * The wallet parts of the shell that ShellPage does not cover: the rows of
 * the account menu, the placeholder shown while the identity is unknown,
 * and RainbowKit's own dialogs (wallet picker, account, networks), which
 * carry RainbowKit's `rk-` test ids.
 */
export class ConnectWalletPage {
  constructor(readonly page: Page) {}

  private get header(): Locator {
    return this.page.getByRole("banner");
  }

  /** The grey placeholder in the header while the connection or the Society address is not known yet. */
  get headerSkeleton(): Locator {
    return this.header.getByTestId("wallet-connect-skeleton");
  }

  /** The header's account button. */
  get accountButton(): Locator {
    return this.header.getByTestId("wallet-account-button");
  }

  /** The member's picture in the account button; absent while the avatar is a plain gradient. */
  get accountAvatarImage(): Locator {
    return this.accountButton.getByRole("img");
  }

  // ---- account menu ----------------------------------------------------------

  get accountMenu(): Locator {
    return this.page.getByTestId("wallet-account-menu");
  }

  /** The "Society address" row's address: shortened as text, in full in `title`. */
  get societyAddress(): Locator {
    return this.accountMenu.getByTestId("wallet-society-address");
  }

  /** The "Wallet (owner)" row's address. The row is absent when the wallet is its own identity. */
  get ownerAddress(): Locator {
    return this.accountMenu.getByTestId("wallet-owner-address");
  }

  /** The copy button of the "Society address" row. Its name is "Copied!" for two seconds after a click. */
  get copySocietyAddress(): Locator {
    return this.accountMenu.getByRole("button", { name: "Copy society address", exact: true });
  }

  /** The copy button of the "Wallet (owner)" row. */
  get copyOwnerAddress(): Locator {
    return this.accountMenu.getByRole("button", { name: "Copy wallet (owner)", exact: true });
  }

  /** A copy button right after it was used. */
  get copiedButton(): Locator {
    return this.accountMenu.getByRole("button", { name: "Copied!", exact: true });
  }

  /** "Wallet settings": opens RainbowKit's account dialog. */
  get walletSettings(): Locator {
    return this.accountMenu.getByTestId("wallet-settings");
  }

  // ---- RainbowKit dialogs ----------------------------------------------------

  /** Whichever RainbowKit dialog is open: the wallet picker, the account dialog or the network list. */
  get dialog(): Locator {
    return this.page.getByRole("dialog");
  }

  /** "Disconnect" in RainbowKit's account dialog. */
  get disconnectButton(): Locator {
    return this.page.getByTestId("rk-disconnect-button");
  }

  /** A network in RainbowKit's "Switch Networks" dialog. */
  chainOption(chainId: number): Locator {
    return this.page.getByTestId(`rk-chain-option-${chainId}`);
  }

  /** Header account button, then "Wallet settings", then "Disconnect". */
  async disconnectThroughSettings() {
    await this.accountButton.click();
    await this.walletSettings.click();
    await this.disconnectButton.click();
  }

  /** What the browser's clipboard holds. The context needs the clipboard-read permission. */
  readClipboard(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }
}
