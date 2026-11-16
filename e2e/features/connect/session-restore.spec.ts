import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { ConnectWalletPage } from "../../support/pages/connect-wallet";

/**
 * What the pages show while wagmi restores the connection after a page
 * load, when the wallet is slow to answer or never answers.
 *
 * On a page load wagmi's reconnect() asks every connector whether it is
 * authorised, and pages show a skeleton until that attempt settles
 * (`wagmiReady`, src/lib/wagmi.ts). The injected EIP-6963 connector asks the
 * wallet eth_accounts and waits for the answer with no time limit, so these
 * tests use the generic identity: as MetaMask the wallet goes through
 * MetaMask's own connector, which gives up by itself after about 1.5 s.
 *
 * With `ssr: true` wagmi overwrites its saved state before it hydrates it,
 * so a returning member reconnects as "connecting", exactly like a visitor.
 * The app tells the two apart by whether a wallet was ever connected in the
 * browser (wagmi's `recentConnectorId`).
 */

/** src/lib/wagmi.ts: WAGMI_READY_TIMEOUT_MS, for a browser that has never connected a wallet. */
const READY_TIMEOUT_MS = 3_000;
/** src/lib/wagmi.ts: WAGMI_RECONNECT_TIMEOUT_MS, for one that has. */
const RECONNECT_TIMEOUT_MS = 15_000;
/** "Within a few seconds": the fallback, plus time to render on a busy machine. */
const RENDERED_WITHIN_MS = READY_TIMEOUT_MS + 5_000;

/**
 * From the next document on, records whether the page body ever showed the
 * logged-out "connect your wallet" card, however briefly. The header is
 * left out: its "Connect Wallet" flash during a reconnect is the known B-4
 * bug in account-menu.spec.ts.
 */
async function recordConnectPrompt(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as { __e2eSawConnectPrompt?: boolean };
    state.__e2eSawConnectPrompt = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="wallet-connect-prompt"]')) state.__e2eSawConnectPrompt = true;
    }).observe(document, { subtree: true, childList: true });
  });
  return () =>
    page.evaluate(() => (window as unknown as { __e2eSawConnectPrompt?: boolean }).__e2eSawConnectPrompt);
}

/** Lets the page run its timers and render: two animation frames. */
async function letThePageRender(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

test.describe("restoring the connection after a page load", () => {
  test.use({ walletIdentity: "generic" });

  test(
    "B-13: a visitor whose wallet never answers still gets the account page and /profile within a few seconds",
    { tag: ["@core"] },
    async ({ actor, pages, wallet }) => {
      const someone = await actor("member", { name: "Patient Pat" });
      // The wallet is installed but hangs: wagmi's question whether the site
      // may see its accounts is never answered.
      const hung = wallet.stopAnswering("eth_accounts");

      await pages.profile.openUser(someone.address);
      await expect.poll(() => hung.hits()).toBeGreaterThan(0);
      // Without the fallback the page stays on its skeleton for good.
      await expect(pages.profile.details).toBeVisible({ timeout: RENDERED_WITHIN_MS });
      await expect(pages.profile.details).toContainText("Patient Pat");
      await expect(pages.profile.skeleton).toHaveCount(0);
      // The header offers to connect, and the button can be used.
      await expect(pages.shell.connectButton).toBeEnabled();

      // /profile, a new page load: the logged-out card, not a skeleton.
      const hitsBefore = hung.hits();
      await pages.profile.open();
      await expect.poll(() => hung.hits()).toBeGreaterThan(hitsBefore);
      await expect(pages.shell.connectPrompt).toBeVisible({ timeout: RENDERED_WITHIN_MS });
      await expect(pages.profile.skeleton).toHaveCount(0);

      // The page rendered without the wallet's answer: every eth_accounts is still open.
      expect(wallet.requestsOf("eth_accounts").length).toBe(hung.hits());
      expect(wallet.isConnected).toBe(false);

      // Connecting still works while the old attempt hangs, and the page follows the account.
      await pages.shell.connect();
      await expect(pages.shell.connectPrompt).toBeHidden();
      expect(wallet.isConnected).toBe(true);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "B-14: a returning member whose wallet is slow to answer after a reload is not shown as logged out",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet }) => {
      const connect = new ConnectWalletPage(page);
      const me = await persona("member");
      // The page's clock, to move past the visitor's 3 s fallback without waiting for it.
      await page.clock.install();
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();

      const sawConnectPrompt = await recordConnectPrompt(page);
      wallet.clearRequests();
      const slow = wallet.stopAnswering("eth_accounts");
      await page.reload();
      await expect.poll(() => slow.hits()).toBeGreaterThan(0);
      await expect(pages.profile.skeleton).toBeVisible();

      // Past the visitor's fallback, the wallet still silent: still a skeleton.
      await page.clock.fastForward(READY_TIMEOUT_MS + 2_000);
      await letThePageRender(page);
      await expect(pages.profile.skeleton).toBeVisible();
      await expect(pages.shell.connectPrompt).toHaveCount(0);

      // The wallet answers: the member's own profile, the session restored without a prompt.
      slow.release();
      await expect(connect.accountButton).toContainText(me.profile!.name);
      await expect(pages.profile.details).toBeVisible();
      expect(await sawConnectPrompt(), "the logged-out card appeared while the wallet was answering").toBe(false);
      // Restored, not connected again: the wallet was never asked to connect.
      expect(wallet.requestsOf("eth_requestAccounts", "wallet_requestPermissions")).toHaveLength(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
    },
  );

  test(
    "B-15: a returning member whose wallet never answers gets the logged-out page after the longer wait, not a skeleton for good",
    { tag: ["@edge"] },
    async ({ page, persona, pages, wallet }) => {
      await persona("member");
      await page.clock.install();
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();

      wallet.clearRequests();
      const hung = wallet.stopAnswering("eth_accounts");
      await page.reload();
      await expect.poll(() => hung.hits()).toBeGreaterThan(0);

      await page.clock.fastForward(RECONNECT_TIMEOUT_MS - 1_000);
      await letThePageRender(page);
      await expect(pages.profile.skeleton).toBeVisible();

      await page.clock.fastForward(2_000);
      await expect(pages.shell.connectPrompt).toBeVisible();
      await expect(pages.profile.skeleton).toHaveCount(0);
      await expect(pages.shell.connectButton).toBeEnabled();
      // Rendered without the wallet's answer: every eth_accounts since the reload is still open.
      expect(wallet.requestsOf("eth_accounts").length).toBe(hung.hits());
    },
  );
});
