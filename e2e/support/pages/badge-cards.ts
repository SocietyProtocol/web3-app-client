import { expect, type Locator } from "@playwright/test";
import { forEachGalleryPage } from "./gallery";

/**
 * A "badges" section of the app (a row of BadgeCards): the first few cards,
 * a "View All ..." button when there are more, and a paginated modal with
 * every badge. Used for the badges a profile holds.
 */
export class BadgeCardSection {
  constructor(
    /** The section: data-testid="<testId>". */
    readonly section: Locator,
    /** The "view all" modal: data-testid="<testId>-modal". */
    readonly modal: Locator,
    private readonly viewAllName: string,
  ) {}

  /** The cards shown in the section itself (the first few badges). */
  get cards(): Locator {
    return this.section.getByTestId("badge-card");
  }

  get viewAllButton(): Locator {
    return this.section.getByRole("button", { name: this.viewAllName });
  }

  /** One badge's card in the section, by badge id. */
  card(badgeId: bigint | string): Locator {
    return this.section.locator(`[data-testid="badge-card"][data-badge-id="${badgeId}"]`);
  }

  /** One badge's card in the modal, on the page that is showing. */
  modalCard(badgeId: bigint | string): Locator {
    return this.modal.locator(`[data-testid="badge-card"][data-badge-id="${badgeId}"]`);
  }

  /** The "n / total" chip at the bottom of a card: units the profile holds over the total supply. */
  amountChip(card: Locator): Locator {
    return card.getByTestId("badge-card-amount");
  }

  /** Badge ids of the cards in the section, in order. */
  async ids(): Promise<string[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-badge-id") ?? "").filter(Boolean),
    );
  }

  async openModal() {
    await this.viewAllButton.click();
    await expect(this.modal).toBeVisible();
  }

  /**
   * Opens the modal if needed and calls `visit` with every badge's card on
   * every page, while that page is showing. Returns the badge ids in order.
   */
  async visitModal(visit: (badgeId: string, card: Locator) => Promise<void>): Promise<string[]> {
    if (!(await this.modal.isVisible())) await this.openModal();
    const cards = this.modal.getByTestId("badge-card");
    const all: string[] = [];
    await forEachGalleryPage(this.modal, cards, async () => {
      const ids = await cards.evaluateAll((elements) =>
        elements.map((card) => card.getAttribute("data-badge-id") ?? "").filter(Boolean),
      );
      for (const id of ids) await visit(id, this.modalCard(id));
      all.push(...ids);
    });
    return all;
  }
}
