import { expect, type Locator, type Page } from "@playwright/test";

export type ToastVariant = "info" | "success" | "error" | "warning" | "default";

/** The app shell: header, wallet connection, network prompts and toasts. */
export class ShellPage {
  constructor(
    readonly page: Page,
    /** data-testid of the test wallet's entry in RainbowKit's picker. */
    private readonly walletPickerTestId: string,
  ) {}

  get header(): Locator {
    return this.page.getByRole("banner");
  }

  /** The header's "Connect Wallet" button (logged out). */
  get connectButton(): Locator {
    return this.header.getByTestId("wallet-connect");
  }

  /** The header's account button (connected). */
  get accountButton(): Locator {
    return this.header.getByTestId("wallet-account-button");
  }

  get accountMenu(): Locator {
    return this.page.getByTestId("wallet-account-menu");
  }

  /** The injected test wallet in RainbowKit's picker. */
  get walletOption(): Locator {
    return this.page.getByTestId(this.walletPickerTestId);
  }

  get connectPrompt(): Locator {
    return this.page.getByTestId("wallet-connect-prompt");
  }

  get wrongNetworkPrompt(): Locator {
    return this.page.getByTestId("wallet-wrong-network");
  }

  get switchNetworkButton(): Locator {
    return this.page.getByTestId("wallet-switch-network");
  }

  get menuButton(): Locator {
    return this.page.getByTestId("shell-menu-button");
  }

  async goto(path = "/") {
    await this.page.goto(path);
  }

  /** Opens the picker from the header and chooses the test wallet. */
  async connect() {
    await this.connectButton.click();
    await this.walletOption.click();
    await expect(this.accountButton).toBeVisible();
  }

  /**
   * Opens the account menu and returns the full addresses it lists: the
   * Society address, and the owner wallet when it differs.
   */
  async readAccountMenu(): Promise<{ society: string | null; owner: string | null }> {
    await this.accountButton.click();
    await expect(this.accountMenu).toBeVisible();
    const society = await this.accountMenu.getByTestId("wallet-society-address").getAttribute("title");
    const ownerRow = this.accountMenu.getByTestId("wallet-owner-address");
    const owner = (await ownerRow.count()) > 0 ? await ownerRow.getAttribute("title") : null;
    await this.page.keyboard.press("Escape");
    await expect(this.accountMenu).toBeHidden();
    return { society, owner };
  }

  /** Toast messages of a variant. Narrow with `.filter({ hasText })` or toastByKey(). */
  toast(variant: ToastVariant): Locator {
    return this.page.getByTestId(`snackbar-${variant}`);
  }

  /**
   * The notice that replaces the pending toast when Society could not
   * sponsor a write and the owner wallet is about to pay instead ("Free gas
   * is unavailable right now, ..."). It stays until the transaction is sent.
   */
  get sponsorshipFallbackNotice(): Locator {
    return this.page.getByTestId("transaction-sponsorship-fallback");
  }

  /**
   * The notice of a write that takes two wallet transactions ("Step 1 of
   * 2: ...", "Step 2 of 2: ..."): the owner wallet first deploys its Light
   * Account, then sends the action through it.
   */
  get transactionStepNotice(): Locator {
    return this.page.getByTestId("transaction-step-notice");
  }

  /**
   * The "View on Block Explorer" link of the submitted or the success toast
   * of a transaction. It is the toast's action, next to its message.
   */
  explorerLink(stage: "submitted" | "success"): Locator {
    return this.page
      .getByRole("alert")
      .filter({ has: this.transactionToast(stage) })
      .getByRole("link", { name: "View on Block Explorer" });
  }

  /**
   * A transaction toast by the end of its key: "pending", "notice",
   * "submitted", "success" or "error" (see useTransaction).
   */
  transactionToast(stage: "pending" | "notice" | "submitted" | "success" | "error"): Locator {
    return this.page.locator(`[data-testid^="snackbar-"][data-snackbar-key$="-${stage}"]`);
  }
}
