import { expect, type Locator, type Page } from "@playwright/test";

/** The names of the role filter's buttons, as the page labels them. */
export type AccountRoleFilter =
  | "Governors"
  | "Contributors"
  | "Core Team"
  | "Advisors"
  | "Moderators"
  | "Basic accounts";

/** The value each role filter has in the `roles` URL parameter. */
export const ROLE_PARAM: Record<AccountRoleFilter, string> = {
  Governors: "governor",
  Contributors: "contributor",
  "Core Team": "core-team",
  Advisors: "advisor",
  Moderators: "moderator",
  "Basic accounts": "basic",
};

/**
 * /accounts: the directory of members. A search box, a sort select, the
 * role filter, a grid of account cards that grows as the page is scrolled,
 * and "Setup Account" for a visitor without a profile.
 */
export class AccountsPage {
  constructor(readonly page: Page) {}

  /** The search box, the sort select and "Setup Account". */
  get controls(): Locator {
    return this.page.getByTestId("accounts-controls");
  }

  get searchInput(): Locator {
    return this.controls.getByPlaceholder("Search by name or address...");
  }

  /** The cross in the search box; only there while the box holds text. */
  get clearSearchButton(): Locator {
    return this.controls.getByRole("button", { name: "Clear search" });
  }

  /** The "Sort by" select; its text is the current choice ("Newest" or "Name"). */
  get sortSelect(): Locator {
    return this.controls.getByRole("combobox");
  }

  get setupAccountButton(): Locator {
    return this.controls.getByRole("button", { name: "Setup Account" });
  }

  get roleFilter(): Locator {
    return this.page.getByRole("group", { name: "Filter by account role" });
  }

  /** One button of the role filter; aria-pressed says whether it is on. */
  roleButton(role: AccountRoleFilter): Locator {
    return this.roleFilter.getByRole("button", { name: role, exact: true });
  }

  /** The grid: account cards, placeholders while loading, the empty text or the error. */
  get grid(): Locator {
    return this.page.getByTestId("accounts-grid");
  }

  /** The account cards that are loaded, in the order shown. */
  get cards(): Locator {
    return this.grid.getByTestId("user-tag");
  }

  /** The grey placeholder cards of the first load. */
  get skeletons(): Locator {
    return this.grid.getByTestId("user-tag-skeleton");
  }

  /**
   * One account's card, by address. A card is a link to the account's
   * public profile, which is how it is told apart here. (The connected
   * member's own card links to /profile instead and is not found this way.)
   */
  card(address: string): Locator {
    return this.cards.filter({ has: this.page.locator(`a[href="/user/${address.toLowerCase()}"]`) });
  }

  get emptyState(): Locator {
    return this.grid.getByText("No accounts found", { exact: true });
  }

  /** "Something went wrong" with the error's message and "Retry". */
  get errorHeading(): Locator {
    return this.grid.getByRole("heading", { name: "Something went wrong" });
  }

  get retryButton(): Locator {
    return this.grid.getByRole("button", { name: "Retry" });
  }

  get loadingMore(): Locator {
    return this.page.getByText("Loading more accounts...", { exact: true });
  }

  async open(query = "") {
    await this.page.goto(`/accounts${query}`);
  }

  /**
   * Goes to the directory through the sidebar, without loading the app
   * again: the wallet stays connected and what the app has already fetched
   * stays known. (The sidebar's entries are in the document twice on a wide
   * screen, once in a hidden drawer: only the one on screen is used.)
   */
  async openFromSidebar() {
    await this.page
      .getByTestId("shell-nav-item")
      .filter({ visible: true })
      .filter({ has: this.page.getByText("Accounts", { exact: true }) })
      .getByRole("link")
      .click();
    await expect(this.page).toHaveURL(/\/accounts(\?|$)/);
  }

  /** The connected member's own card: the one that links to /profile. */
  get ownCard(): Locator {
    return this.cards.filter({ has: this.page.locator('a[href="/profile"]') });
  }

  /**
   * Waits for the first load to be over: the grid shows cards, the empty
   * text or the error, and no placeholder cards.
   */
  async loaded() {
    await expect(this.cards.first().or(this.emptyState).or(this.errorHeading)).toBeVisible();
    await expect(this.skeletons).toHaveCount(0);
  }

  /** Types into the search box. The list follows half a second after the last key. */
  async search(text: string) {
    await this.searchInput.fill(text);
  }

  async sortBy(option: "Newest" | "Name") {
    await this.sortSelect.click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
    await expect(this.sortSelect).toHaveText(option);
  }

  /** Switches one role filter on or off. */
  async toggleRole(role: AccountRoleFilter) {
    await this.roleButton(role).click();
  }

  /** A parameter of the page's URL, or null: `search`, `orderBy`, `roles`. */
  urlParam(name: string): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }

  /**
   * Addresses of the loaded cards, lowercase, in the order shown, read from
   * the cards' links. The connected member's own card links to /profile and
   * is returned as "profile".
   */
  async addresses(): Promise<string[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => {
        const href = card.querySelector("a")?.getAttribute("href") ?? "";
        return href.startsWith("/user/") ? href.slice("/user/".length).toLowerCase() : href.replace(/^\//, "");
      }),
    );
  }

  /**
   * Scrolls to the end of the list, again and again, until `total` cards
   * are loaded: the page fetches the next fifty whenever its end comes into
   * view. Fails when the list ends with another number of cards.
   */
  async scrollUntilLoaded(total: number, options: { timeout?: number } = {}) {
    const timeout = options.timeout ?? 60_000;
    await expect(async () => {
      await this.cards.last().scrollIntoViewIfNeeded({ timeout: Math.min(timeout, 10_000) });
      expect(await this.cards.count()).toBe(total);
    }).toPass({ timeout });
    await expect(this.loadingMore).toBeHidden({ timeout });
  }
}
