import { numberToHex } from "viem";
import { CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { ConnectWalletPage, WRONG_NETWORK_LABEL } from "../../support/pages/connect-wallet";

/**
 * A wallet that is on another network than the app's (Sepolia in the
 * suite's build). The app is configured with that one chain only, so any
 * other is "wrong": the header says so, and pages that need the network
 * (here /create-badge) replace their content with a prompt to switch.
 */
const MAINNET = 1;

test.describe("wrong network", () => {
  test(
    "B-6: on the wrong network the header shows an error state and a guarded page asks to switch to Sepolia",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      await pages.badgeCreate.open();
      await pages.shell.connect();
      await expect(pages.badgeCreate.heading).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(connect.accountButton).not.toHaveAccessibleName(WRONG_NETWORK_LABEL);

      // The user changes the network in the wallet.
      await wallet.setChainId(MAINNET);

      // Header: still the member, now marked as on the wrong network.
      await expect(connect.accountButton).toHaveAccessibleName(WRONG_NETWORK_LABEL);
      await expect(connect.accountButton).toContainText(me.profile!.name);
      await connect.accountButton.hover();
      await expect(page.getByRole("tooltip").filter({ hasText: WRONG_NETWORK_LABEL })).toBeVisible();

      // The guarded page: a prompt in place of its content.
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toContainText("You are connected to the wrong network.");
      await expect(pages.shell.wrongNetworkPrompt).toContainText("Please switch to Sepolia to continue.");
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      await expect(pages.shell.switchNetworkButton).toBeEnabled();
      await expect(pages.badgeCreate.heading).toBeHidden();
      await expect(pages.shell.connectPrompt).toBeHidden();

      // In this state the header button opens the list of networks, not the account menu.
      await connect.accountButton.click();
      await expect(connect.dialog).toBeVisible();
      await expect(connect.chainOption(CHAIN_ID)).toBeVisible();
      await expect(connect.accountMenu).toBeHidden();
      await page.keyboard.press("Escape");
      await expect(connect.dialog).toBeHidden();

      // Showing all this asked the wallet for nothing, and changed nothing in it.
      expect(wallet.requestsOf("wallet_switchEthereumChain")).toHaveLength(0);
      expect(wallet.reportedChainId).toBe(MAINNET);

      // A page that only shows data is not guarded: the member's profile is
      // still there, and the header keeps its warning.
      await pages.profile.open();
      await expect(pages.profile.details).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(connect.accountButton).toHaveAccessibleName(WRONG_NETWORK_LABEL);
    },
  );

  test(
    "B-7: \"Switch to Sepolia\" asks the wallet to switch, and the page's content appears",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet }) => {
      const connect = new ConnectWalletPage(page);
      await persona("member");
      await pages.badgeCreate.open();
      await pages.shell.connect();
      await expect(pages.badgeCreate.heading).toBeVisible();
      await wallet.setChainId(MAINNET);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();

      wallet.clearRequests();
      const prompt = wallet.holdNext("chainSwitch");
      await pages.shell.switchNetworkButton.click();
      await prompt.requested;
      // While the wallet's prompt is open.
      await expect(pages.shell.switchNetworkButton).toHaveText("Switching...");
      await expect(pages.shell.switchNetworkButton).toBeDisabled();
      await expect(pages.badgeCreate.heading).toBeHidden();
      prompt.approve();

      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(pages.badgeCreate.heading).toBeVisible();
      await expect(connect.accountButton).not.toHaveAccessibleName(WRONG_NETWORK_LABEL);

      // Exactly one request, for the app's network, and the wallet is on it now.
      const switches = wallet.requestsOf("wallet_switchEthereumChain");
      expect(switches.map((request) => request.outcome)).toEqual(["ok"]);
      expect(switches[0].params).toEqual([{ chainId: numberToHex(CHAIN_ID) }]);
      expect(wallet.reportedChainId).toBe(CHAIN_ID);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // With the network right again, the header button is the account menu.
      await connect.accountButton.click();
      await expect(connect.accountMenu).toBeVisible();
    },
  );

  test(
    "B-7: a declined switch leaves the prompt in place; the header's network list switches too",
    { tag: ["@edge"] },
    async ({ page, persona, pages, wallet, browserErrors }) => {
      const connect = new ConnectWalletPage(page);
      await persona("member");
      await pages.badgeCreate.open();
      await pages.shell.connect();
      await wallet.setChainId(MAINNET);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      wallet.clearRequests();

      const outcomes = () => wallet.requestsOf("wallet_switchEthereumChain").map((request) => request.outcome);

      // The user declines in the wallet.
      wallet.rejectNextChainSwitch();
      await pages.shell.switchNetworkButton.click();
      await expect.poll(outcomes).toEqual(["rejected"]);
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      await expect(pages.shell.switchNetworkButton).toBeEnabled();
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.badgeCreate.heading).toBeHidden();
      await expect(connect.accountButton).toHaveAccessibleName(WRONG_NETWORK_LABEL);
      expect(wallet.reportedChainId).toBe(MAINNET);
      expect(browserErrors.filter((error) => error.startsWith("pageerror:"))).toEqual([]);

      // The other way to switch: the header button's list of networks.
      await connect.accountButton.click();
      await connect.chainOption(CHAIN_ID).click();
      await expect(connect.dialog).toBeHidden();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(pages.badgeCreate.heading).toBeVisible();
      await expect(connect.accountButton).not.toHaveAccessibleName(WRONG_NETWORK_LABEL);
      expect(outcomes()).toEqual(["rejected", "ok"]);
      expect(wallet.reportedChainId).toBe(CHAIN_ID);
    },
  );
});
