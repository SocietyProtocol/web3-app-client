import { expect, type Locator } from "@playwright/test";
import { forEachGalleryPage } from "./gallery";

/**
 * A "users" section of the app (UserList): the first few user cards, a
 * "View All ..." button when there are more, and a paginated modal with
 * every user. Shared by the badge holders and the governors.
 */
export class UserListSection {
  constructor(
    /** The section: data-testid="<testId>". */
    readonly section: Locator,
    /** The "view all" modal: data-testid="<testId>-modal". */
    readonly modal: Locator,
    private readonly rowTestId: string,
    private readonly viewAllName: string,
  ) {}

  /** The cards shown in the section itself (the first few users). */
  get rows(): Locator {
    return this.section.getByTestId(this.rowTestId);
  }

  get viewAllButton(): Locator {
    return this.section.getByRole("button", { name: this.viewAllName });
  }

  /** One user's card in the section, by address. */
  row(address: string): Locator {
    return this.section.locator(`[data-testid="${this.rowTestId}"][data-address="${address.toLowerCase()}"]`);
  }

  /** One user's card in the modal, on the page that is showing. */
  modalRow(address: string): Locator {
    return this.modal.locator(`[data-testid="${this.rowTestId}"][data-address="${address.toLowerCase()}"]`);
  }

  /** Addresses of the cards in the section, in order. */
  async addresses(): Promise<string[]> {
    return this.rows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-address") ?? "").filter(Boolean));
  }

  async openModal() {
    await this.viewAllButton.click();
    await expect(this.modal).toBeVisible();
  }

  /**
   * Opens the modal if needed and pages through it, from its first page,
   * until the user's card is showing. Returns the card; fails when the user
   * is on no page.
   */
  async findInModal(address: string): Promise<Locator> {
    if (!(await this.modal.isVisible())) await this.openModal();
    const row = this.modalRow(address);
    let found = false;
    await forEachGalleryPage(this.modal, this.modal.getByTestId(this.rowTestId), async () => {
      found = (await row.count()) > 0;
      return found;
    });
    if (!found) throw new Error(`${address} is not in the "${this.viewAllName}" modal`);
    return row;
  }

  /** Every address in the modal, across its pages, in order. */
  async allAddressesInModal(): Promise<string[]> {
    return this.visitModal(async () => undefined);
  }

  /**
   * Opens the modal if needed and calls `visit` with every user's card on
   * every page, while that page is showing. Returns the addresses in order.
   */
  async visitModal(visit: (address: string, card: Locator) => Promise<void>): Promise<string[]> {
    if (!(await this.modal.isVisible())) await this.openModal();
    const rows = this.modal.getByTestId(this.rowTestId);
    const all: string[] = [];
    await forEachGalleryPage(this.modal, rows, async () => {
      const addresses = await rows.evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-address") ?? "").filter(Boolean),
      );
      for (const address of addresses) await visit(address, this.modalRow(address));
      all.push(...addresses);
    });
    return all;
  }

  async closeModal() {
    await this.modal.getByRole("button", { name: "close" }).click();
    await expect(this.modal).toBeHidden();
  }
}

/**
 * The exact numbers behind an amount chip (data-count / data-total) and its
 * label, as they are at this moment. The count and the total are two reads
 * of the page: `total` is undefined until the second one is in. To assert
 * on an amount, prefer `await expect(chip).toHaveText("2 / 15")`, which
 * waits for it.
 */
export async function readAmountChip(
  chip: Locator,
): Promise<{ count: bigint; total: bigint | undefined; label: string }> {
  await expect(chip).toBeVisible();
  // One read, so that a re-render between two reads cannot mix two states.
  const { count, total, label } = await chip.evaluate((element) => ({
    count: element.getAttribute("data-count"),
    total: element.getAttribute("data-total"),
    label: (element.textContent ?? "").trim(),
  }));
  if (count === null) throw new Error("The amount chip has no data-count attribute");
  return {
    count: BigInt(count),
    total: total === null ? undefined : BigInt(total),
    label,
  };
}
