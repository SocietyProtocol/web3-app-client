import { expect, type Locator, type Page } from "@playwright/test";
import { BROWSER_RPC_HOST } from "../../env/hermetic";

/** balanceOf(address,uint256) of ERC-1155. */
const BALANCE_OF_SELECTOR = "00fdd58e";

/**
 * The Actions area of /badges/<id> beyond a single mint: batch minting
 * (typed addresses or a CSV file), the hints under a recipient, and the
 * Burn and Transfer tabs. The single mint and the shared parts (recipient
 * input, Mint button, simulation error, gas label) are in BadgePage
 * (badge.ts).
 */
export class BadgeActionsPanel {
  constructor(readonly page: Page) {}

  get area(): Locator {
    return this.page.getByTestId("badge-actions");
  }

  /** Mint, Transfer and Burn: only those the visitor may use are there. */
  get tabs(): Locator {
    return this.page.getByRole("tablist", { name: "badge actions" }).getByRole("tab");
  }

  tab(name: "Mint" | "Transfer" | "Burn"): Locator {
    return this.page.getByRole("tablist", { name: "badge actions" }).getByRole("tab", { name, exact: true });
  }

  /** An entry of a user picker's dropdown, by the name or address it shows. */
  option(text: string): Locator {
    return this.page.getByRole("option").filter({ hasText: text });
  }

  /** What a picker that only offers listed users shows when nobody matches. */
  get noOptions(): Locator {
    return this.page.getByText("No options", { exact: true });
  }

  // ---- mint: batch ------------------------------------------------------------

  /** "Single" / "Batch" inside the Mint tab. */
  mintMode(name: "Single" | "Batch"): Locator {
    return this.area.getByRole("tab", { name, exact: true });
  }

  /** The recipient field: one address in Single mode, a list of chips in Batch mode. */
  get recipientInput(): Locator {
    return this.page.getByTestId("mint-recipient-input");
  }

  /** The remove button of a recipient chip in Batch mode; one per recipient. */
  get recipientChipRemoveButtons(): Locator {
    return this.area.getByRole("button", { name: /^Remove 0x[0-9a-fA-F]{40}$/ });
  }

  /** Adds one address to the Batch recipients, as typed and confirmed with Enter. */
  async addBatchRecipient(address: string) {
    await this.recipientInput.fill(address);
    await this.recipientInput.press("Enter");
  }

  /** The CSV drop area of Batch mode. It goes away once there are recipients. */
  get dropArea(): Locator {
    return this.area.getByRole("region", { name: "File upload area" });
  }

  /** The drop area's file input (hidden; setInputFiles works on it). */
  get fileInput(): Locator {
    return this.dropArea.locator('input[type="file"]');
  }

  async uploadRecipients(file: { name: string; content: string | Buffer; mimeType?: string }) {
    await this.fileInput.setInputFiles({
      name: file.name,
      mimeType: file.mimeType ?? "text/csv",
      buffer: typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content,
    });
  }

  /** "Valid: n" under an uploaded file. */
  get validCount(): Locator {
    return this.area.getByText(/^Valid: \d+$/);
  }

  /** "Invalid: n" under an uploaded file. */
  get invalidCount(): Locator {
    return this.area.getByText(/^Invalid: \d+$/);
  }

  /** A line of the list of entries of the file that are not addresses ("> entry"). */
  invalidEntry(entry: string): Locator {
    return this.area.getByText(`> ${entry}`, { exact: true });
  }

  get clearAllButton(): Locator {
    return this.area.getByRole("button", { name: "(Clear All)" });
  }

  // ---- recipient hints ----------------------------------------------------------

  /** "<wallet> is a migrated wallet. Using its Society address <address> instead." */
  get mappedNotice(): Locator {
    return this.page.getByTestId("recipient-mapped-notice");
  }

  /** "If <address> is a wallet, the member's Society address is ..."; one per recipient that may be a wallet. */
  get walletHints(): Locator {
    return this.page.getByTestId("recipient-wallet-hint");
  }

  /**
   * Resolves when the chain has answered the app's read of the code at
   * `address`. A wallet hint is only shown, or left out, after that read:
   * until then there is none whatever the address is. So "no hint" proves
   * nothing before it. Start it BEFORE the step that puts the address in
   * the field, await it after:
   *
   *   const decided = actions.codeRead(address);
   *   await pages.badge.setMintRecipient(address);
   *   await decided;
   *   await expect(actions.walletHints).toHaveCount(0);
   *
   * It never resolves for an address whose code the page has read before
   * (the app keeps the answer), and the test then fails on its time limit.
   */
  async codeRead(address: string): Promise<void> {
    const wanted = address.toLowerCase();
    const response = await this.page.waitForResponse((candidate) => {
      const request = candidate.request();
      if (request.method() !== "POST" || new URL(request.url()).host !== BROWSER_RPC_HOST) return false;
      const body = (request.postData() ?? "").toLowerCase();
      return body.includes("eth_getcode") && body.includes(wanted);
    });
    await response.finished();
  }

  /** "Replace" on a wallet hint: only there when the app knows the address is a wallet. */
  replaceButton(hint: Locator): Locator {
    return hint.getByRole("button", { name: "Replace" });
  }

  // ---- amount (burn and transfer) ------------------------------------------------

  /**
   * "Amount" of the Burn and the Transfer tab. Only there once the chosen
   * holder is known to have more than one copy; its description is "Holds n"
   * or the reason the amount is refused.
   */
  get amountInput(): Locator {
    return this.area.getByRole("textbox", { name: "Amount", exact: true });
  }

  /**
   * Resolves when the chain has answered a read of `holder`'s balance of a
   * badge (ERC-1155 balanceOf, alone or in a Multicall3 batch). Whether
   * "Amount" is offered is only decided after the read of the chosen
   * holder's balance, so its absence proves nothing before. Start it BEFORE
   * the holder is chosen, await it after (like codeRead).
   */
  async balanceRead(holder: string): Promise<void> {
    const wanted = holder.slice(2).toLowerCase();
    const response = await this.page.waitForResponse((candidate) => {
      const request = candidate.request();
      if (request.method() !== "POST" || new URL(request.url()).host !== BROWSER_RPC_HOST) return false;
      const body = (request.postData() ?? "").toLowerCase();
      return body.includes("eth_call") && body.includes(BALANCE_OF_SELECTOR) && body.includes(wanted);
    });
    await response.finished();
  }

  // ---- burn ---------------------------------------------------------------------

  get burnHolderInput(): Locator {
    return this.page.getByTestId("burn-holder-input");
  }

  get burnConfirmCheckbox(): Locator {
    return this.area.getByLabel("I understand this action cannot be undone.");
  }

  get burnSubmit(): Locator {
    return this.page.getByTestId("burn-submit");
  }

  async openBurnTab() {
    await this.tab("Burn").click();
    await expect(this.burnHolderInput).toBeVisible();
  }

  /** Searches the holder picker and chooses the entry that shows `optionText`. */
  async pickBurnHolder(search: string, optionText = search) {
    await this.burnHolderInput.fill(search);
    await this.option(optionText).click();
  }

  // ---- transfer -----------------------------------------------------------------

  get transferFromInput(): Locator {
    return this.page.getByTestId("transfer-from-input");
  }

  get transferToInput(): Locator {
    return this.page.getByTestId("transfer-to-input");
  }

  get transferSubmit(): Locator {
    return this.page.getByTestId("transfer-submit");
  }

  async openTransferTab() {
    await this.tab("Transfer").click();
    await expect(this.transferFromInput).toBeVisible();
  }

  async pickTransferFrom(search: string, optionText = search) {
    await this.transferFromInput.fill(search);
    await this.option(optionText).click();
  }

  async pickTransferTo(search: string, optionText = search) {
    await this.transferToInput.fill(search);
    await this.option(optionText).click();
  }

  /** Types an address into "To" and confirms it. */
  async setTransferTo(address: string) {
    await this.transferToInput.fill(address);
    await this.transferToInput.press("Enter");
  }
}
