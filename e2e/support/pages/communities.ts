import { expect, type Locator, type Page } from "@playwright/test";

export type TierName = "Gold" | "Silver" | "Bronze" | "Unaffiliated";

/** The choices of the "Sort by" select, as the page labels them, and their value in the `orderBy` URL parameter. */
export const SORT_PARAM = {
  Tier: "tierId",
  Alphabetical: "name",
  Newest: "createdAt",
  Members: "memberCount",
} as const;
export type CommunitySort = keyof typeof SORT_PARAM;

/**
 * /communities: the list of communities. Two tabs (All, My Communities), a
 * search box, the tier filter, a sort select, and a grid of community cards
 * that grows as the page is scrolled.
 *
 * Not in `pages` of e2e/fixtures.ts yet: make one with `new CommunitiesPage(page)`.
 */
export class CommunitiesPage {
  constructor(readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Communities", exact: true, level: 1 });
  }

  get faqLink(): Locator {
    return this.page.getByRole("link", { name: "Learn more about communities" });
  }

  get createLink(): Locator {
    return this.page.getByRole("link", { name: "Create Community" });
  }

  get allTab(): Locator {
    return this.page.getByRole("tab", { name: "All Communities" });
  }

  /** Disabled while no wallet is connected. */
  get myTab(): Locator {
    return this.page.getByRole("tab", { name: "My Communities" });
  }

  /** Only on the My Communities tab. */
  get managedOnlySwitch(): Locator {
    return this.page.getByLabel("Only communities that I manage");
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder("Search by name...");
  }

  /** The cross in the search box; only there while the box holds text. */
  get clearSearchButton(): Locator {
    return this.page.getByRole("button", { name: "Clear search" });
  }

  get tierFilter(): Locator {
    return this.page.getByRole("group", { name: "Filter by tier" });
  }

  /** One button of the tier filter; aria-pressed says whether it is on. */
  tierButton(tier: TierName): Locator {
    return this.tierFilter.getByRole("button", { name: `${tier} tier`, exact: true });
  }

  /**
   * The "Sort by" select; its text is the current choice. MUI puts the
   * Select's aria-label on the wrapper, not on the combobox inside it.
   */
  get sortSelect(): Locator {
    return this.page.locator('[aria-label="Sort by"]').getByRole("combobox");
  }

  /** The community cards that are loaded, in the order shown. */
  get cards(): Locator {
    return this.page.getByTestId("community-card");
  }

  /** The grey placeholder cards of the first load. */
  get skeletons(): Locator {
    return this.page.getByTestId("community-card-skeleton");
  }

  /** One community's card, by id. */
  card(id: string | bigint | number): Locator {
    return this.page.locator(`[data-testid="community-card"][data-community-id="${id}"]`);
  }

  /** The tier a card shows at its bottom: "Gold", "Silver", "Bronze" or "Unaffiliated". */
  cardTier(card: Locator): Locator {
    return card.getByText(/^(Gold|Silver|Bronze|Unaffiliated)$/);
  }

  get emptyState(): Locator {
    return this.page.getByText("No communities found", { exact: true });
  }

  /** "We have N unaffiliated communities.", under the empty state. */
  get unaffiliatedHint(): Locator {
    return this.page.getByText(/^We have (\d+|100\+) unaffiliated (community|communities)\.$/);
  }

  get showUnaffiliatedButton(): Locator {
    return this.page.getByRole("button", { name: "Show unaffiliated" });
  }

  /** The heading of the error card that takes the grid's place when the list cannot be loaded. */
  get errorHeading(): Locator {
    return this.page.getByRole("heading", { name: "Something went wrong" });
  }

  get retryButton(): Locator {
    return this.page.getByRole("button", { name: "Retry" });
  }

  get loadingMore(): Locator {
    return this.page.getByText("Loading more communities...");
  }

  /** `query` is the URL's query string, with its "?". */
  async open(query = "") {
    await this.page.goto(`/communities${query}`);
  }

  /** Ids of the cards in the grid, in order. */
  async ids(): Promise<string[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-community-id") ?? "").filter(Boolean),
    );
  }

  /** Types into the search box. The list follows half a second later. */
  async search(text: string) {
    await this.searchInput.fill(text);
  }

  async sortBy(choice: CommunitySort) {
    await this.sortSelect.click();
    await this.page.getByRole("option", { name: choice, exact: true }).click();
    await expect(this.sortSelect).toHaveText(choice);
  }

  /** Turns one tier of the filter on or off, whatever it is now. */
  async setTier(tier: TierName, on: boolean) {
    const button = this.tierButton(tier);
    if ((await button.getAttribute("aria-pressed")) !== String(on)) await button.click();
    await expect(button).toHaveAttribute("aria-pressed", String(on));
  }

  /** A parameter of the page's URL, or null: `tab`, `managed`, `search`, `tier`, `orderBy`. */
  urlParam(name: string): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }

  /**
   * Scrolls to the end of the grid, again and again, until `total` cards
   * are loaded: the page fetches the next fifty whenever its end comes into
   * view. Fails when the list ends with another number of cards.
   */
  async scrollUntilLoaded(total: number) {
    await expect(async () => {
      await this.cards.last().scrollIntoViewIfNeeded();
      expect(await this.cards.count()).toBe(total);
    }).toPass();
  }
}
