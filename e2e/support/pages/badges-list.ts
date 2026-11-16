import { expect, type Locator, type Page } from "@playwright/test";

export type BadgesTab = "All" | "Managed by me" | "My badges";
export type BadgeCategory = "Official" | "Community" | "Individual";
export type BadgeSort = "Newest" | "Holders" | "Name" | "ID";
export type BadgeCreatedBy = "Anyone" | "Me" | "Address";

/**
 * /badges: the grid of badges with its tabs, search, category toggles,
 * sort and "Created by" filter. Every control keeps its state in the URL
 * (tab, search, category, orderBy, createdBy, createdByAddress); a value
 * that is the default is left out of the URL.
 */
export class BadgesListPage {
  constructor(readonly page: Page) {}

  async open(query = "") {
    await this.page.goto(`/badges${query}`);
  }

  // ---- header ---------------------------------------------------------------

  get intro(): Locator {
    return this.page.getByText("Browse on-chain badges", { exact: true });
  }

  get faqLink(): Locator {
    return this.page.getByRole("link", { name: "Learn more about Badges" });
  }

  get createBadgeButton(): Locator {
    return this.page.getByRole("button", { name: "Create Badge", exact: true });
  }

  // ---- controls -------------------------------------------------------------

  tab(name: BadgesTab): Locator {
    return this.page.getByRole("tab", { name, exact: true });
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder("Search by name or address...");
  }

  get clearSearchButton(): Locator {
    return this.page.getByRole("button", { name: "Clear search" });
  }

  /** A category toggle; `aria-pressed` says whether it is on. */
  categoryToggle(category: BadgeCategory): Locator {
    return this.page
      .getByRole("group", { name: "Filter by badge category" })
      .getByRole("button", { name: `${category} badges`, exact: true });
  }

  /**
   * The "Sort by" select. FilterSelect gives its label to the MUI Select as
   * aria-label, and MUI puts that on the select's wrapper, not on the
   * combobox inside it (the combobox's own name is the chosen option). So
   * the combobox is found through the wrapper. Its text is the chosen option.
   */
  get sortSelect(): Locator {
    return this.page.locator('[aria-label="Sort by"]').getByRole("combobox");
  }

  /** The "Created by" select; see sortSelect. */
  get createdBySelect(): Locator {
    return this.page.locator('[aria-label="Created by"]').getByRole("combobox");
  }

  /** The address field that appears next to "Created by" when it is set to Address. */
  get createdByAddressInput(): Locator {
    return this.page.getByPlaceholder("0x...");
  }

  async chooseSort(option: BadgeSort) {
    await this.sortSelect.click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
    await expect(this.sortSelect).toHaveText(option);
  }

  async chooseCreatedBy(option: BadgeCreatedBy) {
    await this.createdBySelect.click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
    await expect(this.createdBySelect).toHaveText(option);
  }

  // ---- the grid -------------------------------------------------------------

  get grid(): Locator {
    return this.page.getByTestId("badges-grid");
  }

  /** The badges in the grid. Loading placeholders have no badge id and are left out. */
  get cards(): Locator {
    return this.grid.locator('[data-testid="badge-card"][data-badge-id]');
  }

  card(badgeId: bigint | string): Locator {
    return this.grid.locator(`[data-testid="badge-card"][data-badge-id="${badgeId}"]`);
  }

  /** Badge ids of the cards in the grid, in the order shown. */
  async ids(): Promise<string[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-badge-id") ?? "").filter(Boolean),
    );
  }

  get emptyMessage(): Locator {
    return this.grid.getByText("No badges found", { exact: true });
  }

  /** The error panel that takes the grid's place when the list cannot be loaded. */
  get errorTitle(): Locator {
    return this.grid.getByText("Something went wrong", { exact: true });
  }

  get retryButton(): Locator {
    return this.grid.getByRole("button", { name: "Retry" });
  }

  /** Shown under the grid while the next thousand badges are being fetched. */
  get loadingMore(): Locator {
    return this.page.getByText("Loading more badges...", { exact: true });
  }

  // ---- the URL --------------------------------------------------------------

  /** A query parameter of the current URL, or null when it is not there. */
  param(name: "tab" | "search" | "category" | "orderBy" | "createdBy" | "createdByAddress"): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }
}
