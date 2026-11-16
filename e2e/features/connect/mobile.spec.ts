import { expect, test } from "../../fixtures";

/**
 * A phone inside a wallet's own browser. RainbowKit decides it is on a
 * phone from the user agent alone, and then lists only the app's wallet
 * list (src/lib/wallets.ts), never EIP-6963 announcements. Before that list
 * had injected wallets, Rabby's, Trust's, OKX's... in-app browser showed
 * only Rainbow, Base, MetaMask and WalletConnect, and tapping MetaMask tried
 * a metamask:// deep link.
 */
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

test.describe("wallet connection on a phone", () => {
  test.use({
    userAgent: IPHONE_SAFARI,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    walletIdentity: "rabby",
  });

  test(
    "B-16: inside Rabby's in-app browser the picker lists the injected wallet and tapping it asks the wallet for accounts",
    { tag: ["@core", "@unverified"] },
    async ({ page, pages, wallet }) => {
      await pages.shell.goto("/");
      await expect(pages.shell.connectButton).toBeVisible();
      expect(wallet.isConnected).toBe(false);

      await pages.shell.connectButton.tap();
      await expect(pages.shell.walletOption).toBeVisible();
      // One entry for the injected wallet, not also the generic one.
      await expect(page.getByTestId("rk-wallet-option-injected")).toHaveCount(0);

      await pages.shell.walletOption.tap();

      await expect(pages.shell.accountButton).toBeVisible();
      expect(wallet.isConnected).toBe(true);
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(1);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
