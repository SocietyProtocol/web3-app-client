import { expect, type Locator, type Page } from "@playwright/test";
import { UserListSection, readAmountChip } from "./user-list";

/** /badges/<id>: the badge detail page, its holders and the Mint tab. */
export class BadgePage {
  /** The Holders section: the first cards, "View All Holders" and its modal. */
  readonly holders: UserListSection;

  constructor(readonly page: Page) {
    this.holders = new UserListSection(
      page.getByTestId("badge-holders"),
      page.getByTestId("badge-holders-modal"),
      "badge-holders-row",
      "View All Holders",
    );
  }

  get actionTabs(): Locator {
    return this.page.getByRole("tablist", { name: "badge actions" });
  }

  get mintTab(): Locator {
    return this.actionTabs.getByRole("tab", { name: "Mint" });
  }

  get mintRecipientInput(): Locator {
    return this.page.getByTestId("mint-recipient-input");
  }

  /** An entry of the recipient picker's dropdown, by the name or address it shows. */
  mintRecipientOption(text: string): Locator {
    return this.page.getByRole("option").filter({ hasText: text });
  }

  /** The "OFFICIAL" label next to the badge's id. */
  get officialLabel(): Locator {
    return this.page.getByText("OFFICIAL", { exact: true });
  }

  /** The "COMMUNITY" label next to the badge's id. */
  get communityLabel(): Locator {
    return this.page.getByText("COMMUNITY", { exact: true });
  }

  get mintExistingHolderWarning(): Locator {
    return this.page.getByTestId("mint-existing-holder-warning");
  }

  get mintSubmit(): Locator {
    return this.page.getByTestId("mint-submit");
  }

  get simulationError(): Locator {
    return this.page.getByTestId("transaction-simulation-error");
  }

  get gasEstimate(): Locator {
    return this.page.getByTestId("transaction-gas-estimate");
  }

  async open(badgeId: bigint | string) {
    await this.page.goto(`/badges/${badgeId}`);
  }

  /** The "n / total" chip on a holder's card (a card from holders.row() or findInModal()). */
  holderAmountChip(card: Locator): Locator {
    return card.getByTestId("badge-holder-amount");
  }

  /** The exact numbers behind the chip on a holder's card, and the label as shown. */
  readHolderAmount(card: Locator) {
    return readAmountChip(this.holderAmountChip(card));
  }

  async openMintTab() {
    await this.mintTab.click();
    await expect(this.mintRecipientInput).toBeVisible();
  }

  /** Types an address into the recipient field and confirms it. */
  async setMintRecipient(address: string) {
    await this.mintRecipientInput.fill(address);
    await this.mintRecipientInput.press("Enter");
  }

  /** Searches the recipient picker and chooses the entry that shows `optionText`. */
  async pickMintRecipient(search: string, optionText = search) {
    await this.mintRecipientInput.fill(search);
    await this.mintRecipientOption(optionText).click();
  }
}
