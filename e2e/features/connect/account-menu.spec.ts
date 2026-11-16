import { isAddressEqual, type Address } from "viem";
import { URLS as APP_URLS } from "../../../src/consts/urls";
import { expect, test } from "../../fixtures";
import { user } from "../../support/builders/entities";
import {
  ConnectWalletPage,
  fullAddress,
  onlyShortAddress,
  shortAddressPattern,
} from "../../support/pages/connect-wallet";

/**
 * The header of a connected wallet: who it says is connected, the account
 * menu, what a reload keeps and how to disconnect.
 */

/** A valid 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("account menu and session", () => {
  test(
    "B-2: the account menu lists the Society address and the owner wallet, and each copy button copies its address",
    { tag: ["@core"] },
    async ({ page, context, persona, pages, wallet }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      expect(isAddressEqual(me.address, me.ownerAddress)).toBe(false);
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await page.goto("/");
      await pages.shell.connect();
      await connect.accountButton.click();
      await expect(connect.accountMenu).toBeVisible();

      // Two labelled rows: shortened on screen, in full in the tooltip text.
      await expect(connect.accountMenu).toContainText("Society address");
      await expect(connect.accountMenu).toContainText("Wallet (owner)");
      await expect(connect.societyAddress).toHaveText(onlyShortAddress(me.address));
      await expect(connect.societyAddress).toHaveAttribute("title", fullAddress(me.address));
      await expect(connect.ownerAddress).toHaveText(onlyShortAddress(me.ownerAddress));
      await expect(connect.ownerAddress).toHaveAttribute("title", fullAddress(me.ownerAddress));
      await expect(connect.walletSettings).toHaveText("Wallet settings");

      // Each copy button puts its own row's full address on the clipboard.
      await connect.copySocietyAddress.click();
      await expect.poll(async () => (await connect.readClipboard()).toLowerCase()).toBe(me.address.toLowerCase());
      await expect(connect.copiedButton).toBeVisible();

      await connect.copyOwnerAddress.click();
      await expect.poll(async () => (await connect.readClipboard()).toLowerCase()).toBe(me.ownerAddress.toLowerCase());
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // Escape closes the menu.
      await page.keyboard.press("Escape");
      await expect(connect.accountMenu).toBeHidden();

      // Looking at the menu asks the wallet for nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "B-3: the header shows a member's profile name and picture instead of an address",
    { tag: ["@core"] },
    async ({ page, persona, pages, subgraph }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      // The persona's profile has no picture. Give it one in the subgraph's
      // answer, and serve the picture where the app will look for it.
      const cid = `e2eheaderavatar${me.address.slice(2, 10).toLowerCase()}`;
      const pictureUrl = `${APP_URLS.IPFS_GATEWAY}/${cid}`;
      await subgraph.overlay(user(me.address, { imageUrl: pictureUrl }));
      let pictureRequests = 0;
      await page.route(`**/ipfs/${cid}`, async (route) => {
        pictureRequests += 1;
        await route.fulfill({ status: 200, contentType: "image/png", body: PNG });
      });

      await page.goto("/");
      await pages.shell.connect();

      await expect(connect.accountButton).toContainText(me.profile!.name);
      await expect(connect.accountButton).not.toContainText(shortAddressPattern(me.address));
      await expect(connect.accountButton).not.toContainText(shortAddressPattern(me.ownerAddress));
      await expect(connect.accountAvatarImage).toHaveAttribute("src", pictureUrl);
      await expect(connect.accountAvatarImage).toHaveJSProperty("naturalWidth", 1);
      expect(pictureRequests).toBeGreaterThan(0);

      // The name stays on other pages.
      await page.goto("/badges");
      await expect(connect.accountButton).toContainText(me.profile!.name);
    },
  );

  test(
    "B-3: without a profile the header shows the shortened Society address and no picture",
    { tag: ["@core"] },
    async ({ page, persona, pages }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("new");
      await page.goto("/");
      await pages.shell.connect();
      await expect(connect.accountButton).toHaveText(onlyShortAddress(me.address));
      await expect(connect.accountAvatarImage).toHaveCount(0);
    },
  );

  test(
    "B-4: a reload keeps the connection; the header shows a placeholder until the identity is known",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, network }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();
      await expect(connect.accountButton).toContainText(me.profile!.name);
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(1);

      // After the reload the app reads the wallet's code to know which
      // identity applies. Keep that read open to look at the moment before.
      wallet.clearRequests();
      const codeRead = network.holdRpc({ method: "eth_getCode" });
      await page.reload();
      await expect.poll(() => codeRead.hits()).toBeGreaterThan(0);

      // Neither "Connect" nor an address: a placeholder.
      await expect(connect.headerSkeleton).toBeVisible();
      await expect(pages.shell.connectButton).toHaveCount(0);
      await expect(connect.accountButton).toHaveCount(0);
      await expect(pages.shell.connectPrompt).toBeHidden();

      codeRead.release();
      await expect(connect.accountButton).toContainText(me.profile!.name);
      await expect(connect.headerSkeleton).toHaveCount(0);
      await expect(pages.profile.details).toBeVisible();

      // The same identity as before, and the wallet was not asked to connect again.
      const menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, me.address)).toBe(true);
      expect(isAddressEqual(menu.owner as Address, me.ownerAddress)).toBe(true);
      expect(wallet.isConnected).toBe(true);
      expect(wallet.requestsOf("eth_requestAccounts", "wallet_requestPermissions")).toHaveLength(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "B-4: a reload never offers \"Connect\" to a wallet that is connected",
    { tag: ["@edge"] },
    async ({ page, persona, pages }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      await pages.profile.open();
      await pages.shell.connect();
      await expect(connect.accountButton).toContainText(me.profile!.name);

      // From the next document on, note whether a Connect button (the
      // header's, or the one in the "connect your wallet" card) was ever in
      // the page, however briefly.
      await page.addInitScript(() => {
        const state = window as unknown as { __e2eSawConnect?: boolean };
        state.__e2eSawConnect = false;
        new MutationObserver(() => {
          if (document.querySelector('[data-testid="wallet-connect"]')) state.__e2eSawConnect = true;
        }).observe(document, { subtree: true, childList: true });
      });
      await page.reload();
      await expect(connect.accountButton).toContainText(me.profile!.name);
      await expect(pages.profile.details).toBeVisible();

      const sawConnect = await page.evaluate(
        () => (window as unknown as { __e2eSawConnect?: boolean }).__e2eSawConnect,
      );
      // While wagmi is still reconnecting, RainbowKit reports no account:
      // the header must keep its skeleton until the reconnect has settled,
      // not show the logged-out button for a moment.
      expect(sawConnect, "a Connect button appeared while the connection was being restored").toBe(false);
    },
  );

  test(
    "B-4: a member's profile page does not ask to set up an account while the reload restores the connection",
    { tag: ["@edge"] },
    async ({ page, persona, pages, network }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();

      const codeRead = network.holdRpc({ method: "eth_getCode" });
      await page.reload();
      await expect.poll(() => codeRead.hits()).toBeGreaterThan(0);
      await expect(connect.headerSkeleton).toBeVisible();

      // While the wallet's code is read, useOutpostAccount reports a
      // connected wallet without an address. That is not "no profile": a
      // member must not see "Welcome! Let's get started by setting up your
      // account." before eth_getCode returns.
      await expect(pages.onboarding.setupPrompt).toBeHidden();

      codeRead.release();
      await expect(pages.profile.details).toBeVisible();
      await expect(connect.accountButton).toContainText(me.profile!.name);
    },
  );

  test(
    "B-5: \"Wallet settings\" disconnects; the header offers Connect again and guarded pages ask for a wallet",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();

      // Account button -> "Wallet settings" -> RainbowKit's account dialog -> Disconnect.
      await connect.accountButton.click();
      await connect.walletSettings.click();
      await expect(connect.accountMenu).toBeHidden();
      await expect(connect.dialog).toBeVisible();
      await connect.disconnectButton.click();
      await expect(connect.dialog).toBeHidden();

      await expect(pages.shell.connectButton).toBeVisible();
      await expect(connect.accountButton).toHaveCount(0);
      // The profile page is guarded: the member's data is gone from the screen.
      await expect(pages.shell.connectPrompt).toBeVisible();
      await expect(pages.profile.details).toBeHidden();

      // Another guarded page, with its own wording.
      await pages.badgeCreate.open();
      await expect(pages.shell.connectPrompt).toContainText("Please connect your wallet to create a badge.");
      await expect(pages.badgeCreate.heading).toBeHidden();
      await expect(pages.shell.connectButton).toBeVisible();

      // A reload does not bring the connection back, and the wallet is not asked.
      await page.reload();
      await expect(pages.shell.connectButton).toBeVisible();
      await expect(pages.shell.connectPrompt).toBeVisible();
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(1);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // Connecting again works and brings the member back.
      await pages.shell.connect();
      await expect(connect.accountButton).toContainText(me.profile!.name);
      await expect(pages.shell.connectPrompt).toBeHidden();
      await expect(pages.badgeCreate.heading).toBeVisible();
    },
  );
});
