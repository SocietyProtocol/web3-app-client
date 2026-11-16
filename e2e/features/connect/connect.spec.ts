import { isAddressEqual, type Address } from "viem";
import { expect, test } from "../../fixtures";

test.describe("wallet connection", () => {
  test(
    "B-1: connect through the picker; the account menu shows the Society address and the owner wallet",
    { tag: ["@smoke"] },
    async ({ pages, wallet, chain }) => {
      await pages.shell.goto("/");
      await expect(pages.shell.connectButton).toBeVisible();
      expect(wallet.isConnected).toBe(false);

      await pages.shell.connectButton.click();
      await expect(pages.shell.walletOption).toBeVisible();
      await pages.shell.walletOption.click();

      await expect(pages.shell.accountButton).toBeVisible();
      await expect(pages.shell.connectButton).toBeHidden();
      expect(wallet.isConnected).toBe(true);
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(1);

      // An EOA's identity is its Light Account, not the wallet address.
      const menu = await pages.shell.readAccountMenu();
      const society = chain.societyAddress(wallet.address);
      expect(menu.society, "Society address in the account menu").not.toBeNull();
      expect(menu.owner, "owner wallet in the account menu").not.toBeNull();
      expect(isAddressEqual(menu.society as Address, society)).toBe(true);
      expect(isAddressEqual(menu.owner as Address, wallet.address)).toBe(true);
      expect(isAddressEqual(society, wallet.address)).toBe(false);

      // Connecting asks for no signature and sends nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test.describe("a wallet RainbowKit does not know", () => {
    test.use({ walletIdentity: "generic" });

    test(
      "B-1: an EIP-6963 wallet is discovered, listed in the picker and connects",
      { tag: ["@core"] },
      async ({ pages, wallet, chain }) => {
        await pages.shell.goto("/");
        await pages.shell.connectButton.click();
        // Listed only because the page announced it through EIP-6963.
        await expect(pages.shell.walletOption).toBeVisible();
        await expect(pages.shell.walletOption).toContainText("E2E Test Wallet");
        await pages.shell.walletOption.click();

        await expect(pages.shell.accountButton).toBeVisible();
        const menu = await pages.shell.readAccountMenu();
        expect(isAddressEqual(menu.society as Address, chain.societyAddress(wallet.address))).toBe(true);
        expect(isAddressEqual(menu.owner as Address, wallet.address)).toBe(true);
        expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(1);
      },
    );
  });
});
