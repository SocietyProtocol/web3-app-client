import { isAddressEqual, type Address, type Hex } from "viem";
import { expect, test } from "../../fixtures";
import { ConnectWalletPage, onlyShortAddress, shortAddressPattern } from "../../support/pages/connect-wallet";
import { ShellNavigationPage } from "../../support/pages/shell-navigation";

/**
 * Which identity a connected wallet gets, and what happens around the
 * connection itself: a declined request, another account picked in the
 * wallet, a wallet that is a contract, a wallet with an EIP-7702
 * delegation, and a wallet whose code cannot be read.
 *
 * The app decides by the code at the wallet's address
 * (src/lib/outpost-routing.ts, outpostIdentity): none, or a 7702
 * delegation (0xef0100...), means the wallet is a key and acts through its
 * Light Account; any other code means the wallet is a contract and acts as
 * itself. The tests put that code at the test wallet's address on the
 * local chain before the page loads.
 */

/** Runtime code of a contract that only reverts: enough to be "a contract". */
const CONTRACT_CODE: Hex = "0x60006000fd";

/** An EIP-7702 delegation designator: 0xef0100 followed by the address delegated to. */
const DELEGATION_CODE: Hex = `0xef0100${"ab".repeat(20)}`;

test.describe("identity of the connected wallet", () => {
  test(
    "B-8: a declined connection request leaves the picker open and the app working; a second try connects",
    { tag: ["@edge"] },
    async ({ page, pages, wallet, chain, browserErrors }) => {
      const connect = new ConnectWalletPage(page);
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(pages.shell.connectButton).toBeVisible();

      const outcomes = () => wallet.requestsOf("eth_requestAccounts").map((request) => request.outcome);

      // The user declines in the wallet.
      wallet.rejectNextConnection();
      await pages.shell.connectButton.click();
      await pages.shell.walletOption.click();
      await expect.poll(outcomes).toEqual(["rejected"]);

      // RainbowKit's dialog is still there, nobody is connected, nothing broke.
      await expect(connect.dialog).toBeVisible();
      await expect(connect.accountButton).toHaveCount(0);
      await expect(pages.shell.connectButton).toBeVisible();
      expect(wallet.isConnected).toBe(false);
      expect(browserErrors.filter((error) => error.startsWith("pageerror:"))).toEqual([]);

      // Closing it gives the page back, still logged out.
      await page.keyboard.press("Escape");
      await expect(connect.dialog).toBeHidden();
      await expect(nav.homeHeading).toBeVisible();
      await expect(nav.homeConnectButton).toBeVisible();

      // Trying again connects.
      await pages.shell.connect();
      expect(outcomes().at(-1)).toBe("ok");
      expect(wallet.isConnected).toBe(true);
      const menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, chain.societyAddress(wallet.address))).toBe(true);
      expect(isAddressEqual(menu.owner as Address, wallet.address)).toBe(true);
      expect(browserErrors.filter((error) => error.startsWith("pageerror:"))).toEqual([]);
    },
  );

  test(
    "B-9: another account picked in the wallet becomes the identity everywhere and closes the setup wizard",
    { tag: ["@edge"] },
    async ({ page, persona, actor, pages, wallet }) => {
      const connect = new ConnectWalletPage(page);
      const member = await persona("member");
      const first = await actor("new");
      const second = await actor("new");

      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details).toBeVisible();
      await expect(connect.accountButton).toContainText(member.profile!.name);

      // The member switches to an account without a profile.
      await wallet.setAccount(first.owner);
      await expect(connect.accountButton).toHaveText(onlyShortAddress(first.address));
      await expect(pages.profile.details).toBeHidden();
      await expect(pages.onboarding.setupPrompt).toBeVisible();
      let menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, first.address)).toBe(true);
      expect(isAddressEqual(menu.owner as Address, first.ownerAddress)).toBe(true);

      // That account opens the setup wizard...
      await pages.onboarding.start();
      await expect(page).toHaveURL((url) => url.searchParams.get("setupOpen") === "true");
      await expect(pages.onboarding.accountHeading).toContainText(shortAddressPattern(first.address));
      await pages.onboarding.nameInput.fill("Typed by the first account");

      // ...and then yet another account is picked: the wizard is not carried over to it.
      await wallet.setAccount(second.owner);
      await expect(connect.accountButton).toHaveText(onlyShortAddress(second.address));
      await expect(pages.onboarding.form).toBeHidden();
      await expect(pages.onboarding.setupPrompt).toBeVisible();
      await expect(page).toHaveURL((url) => url.searchParams.get("setupOpen") !== "true");
      menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, second.address)).toBe(true);
      expect(isAddressEqual(menu.owner as Address, second.ownerAddress)).toBe(true);

      // A wizard opened by this account starts empty.
      await pages.onboarding.start();
      await expect(pages.onboarding.accountHeading).toContainText(shortAddressPattern(second.address));
      await expect(pages.onboarding.nameInput).toHaveValue("");

      // Back to the member: the profile, not a wizard.
      await wallet.setAccount(member.owner);
      await expect(connect.accountButton).toContainText(member.profile!.name);
      await expect(pages.onboarding.form).toBeHidden();
      await expect(pages.profile.details).toBeVisible();

      // Switching accounts is the wallet's doing: the app asked to connect once and for nothing else.
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(1);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "B-10: a wallet that is a contract is its own identity: no owner row and no Light Account",
    { tag: ["@edge"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const connect = new ConnectWalletPage(page);
      const nav = new ShellNavigationPage(page);
      const me = await persona("new");
      await chain.anvil.setCode({ address: me.ownerAddress, bytecode: CONTRACT_CODE });
      expect(await chain.isContract(me.ownerAddress)).toBe(true);

      await page.goto("/");
      await pages.shell.connect();

      // The header and the menu show the wallet's own address, once.
      await expect(connect.accountButton).toHaveText(onlyShortAddress(me.ownerAddress));
      const menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, me.ownerAddress)).toBe(true);
      expect(menu.owner, "a contract wallet has no separate owner row").toBeNull();

      // The profile it would set up belongs to the wallet, not to a Light Account.
      await nav.claimAccountButton.click();
      await expect(pages.onboarding.form).toBeVisible();
      await expect(pages.onboarding.accountHeading).toContainText(shortAddressPattern(me.ownerAddress));
      await expect(pages.onboarding.accountHeading).not.toContainText(shortAddressPattern(me.address));

      // Nothing was deployed or sent on the way.
      expect(await chain.isContract(me.address), "the wallet's Light Account address has no code").toBe(false);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "B-11: a wallet with an EIP-7702 delegation still acts through its Light Account",
    { tag: ["@edge"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const connect = new ConnectWalletPage(page);
      const nav = new ShellNavigationPage(page);
      const me = await persona("new");
      await chain.anvil.setCode({ address: me.ownerAddress, bytecode: DELEGATION_CODE });
      // The wallet's address has code now, but it is a delegation, not a contract.
      expect(await chain.isContract(me.ownerAddress)).toBe(true);

      await page.goto("/");
      await pages.shell.connect();

      await expect(connect.accountButton).toHaveText(onlyShortAddress(me.address));
      const menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, me.address)).toBe(true);
      expect(isAddressEqual(menu.owner as Address, me.ownerAddress)).toBe(true);
      expect(isAddressEqual(me.address, me.ownerAddress)).toBe(false);

      // The profile it would set up belongs to the Light Account.
      await nav.claimAccountButton.click();
      await expect(pages.onboarding.form).toBeVisible();
      await expect(pages.onboarding.accountHeading).toContainText(shortAddressPattern(me.address));
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "B-12: when the wallet's code cannot be read the app falls back to the Light Account instead of waiting forever",
    { tag: ["@edge"] },
    async ({ page, persona, pages, network }) => {
      const connect = new ConnectWalletPage(page);
      const nav = new ShellNavigationPage(page);
      const me = await persona("new");
      const codeRead = network.failRpc({ method: "eth_getCode" });

      await page.goto("/");
      await pages.shell.connectButton.click();
      await pages.shell.walletOption.click();

      await expect.poll(() => codeRead.hits()).toBeGreaterThan(0);

      // Once the app gives up on the read (a few retries, some seconds), the
      // wallet is treated as a key: its Light Account is the identity.
      await expect(connect.accountButton).toHaveText(onlyShortAddress(me.address));
      await expect(connect.headerSkeleton).toHaveCount(0);
      const menu = await pages.shell.readAccountMenu();
      expect(isAddressEqual(menu.society as Address, me.address)).toBe(true);
      expect(isAddressEqual(menu.owner as Address, me.ownerAddress)).toBe(true);

      // The rest of the page has settled on that identity too.
      await expect(nav.claimAccountButton).toBeVisible();
      await expect(nav.homeConnectButton).toHaveCount(0);

      // The read was failing the whole time: this was the fallback, not a late success.
      expect(codeRead.hits()).toBeGreaterThan(0);
      codeRead.release();
    },
  );
});
