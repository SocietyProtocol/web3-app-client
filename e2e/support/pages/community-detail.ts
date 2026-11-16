import { expect, type Locator, type Page } from "@playwright/test";

export type CommunityTab = "overview" | "members" | "badges" | "governance" | "settings";

const TAB_NAME: Record<CommunityTab, string | RegExp> = {
  overview: "Overview",
  members: "Members",
  badges: "Badges",
  // The tab's label is "Governance" plus a "Coming Soon" chip.
  governance: /^Governance/,
  settings: "Settings",
};

export type MemberSort = "Newest" | "Oldest" | "Name";
export type CommunityBadgeRole = "manager" | "assistant" | "member";

/**
 * /communities/<id>: a community's page. A header (name, counts, tier) and
 * five tabs: Overview (member count, About, Recent Activity), Members (the
 * table, and for the manager "Revoke" and the badge-actions panel), Badges,
 * Governance (a placeholder) and, for the manager only, Settings.
 *
 * Not in `pages` of e2e/fixtures.ts yet: make one with `new CommunityDetailPage(page)`.
 */
export class CommunityDetailPage {
  constructor(readonly page: Page) {}

  /** `tab` is the value of the `tab` URL parameter; the Overview when left out. */
  async open(id: string | bigint | number, tab?: CommunityTab) {
    return this.page.goto(`/communities/${id}${tab ? `?tab=${tab}` : ""}`);
  }

  // ---- header ----------------------------------------------------------------

  /** The community's name in the header. */
  name(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  /** "3 Members · 3 Badges" under the name. */
  get counts(): Locator {
    return this.page.getByText(/^\d+ Members · \d+ Badges$/);
  }

  /** "Gold Community", "Unaffiliated Community", ... next to the name. */
  get tierLabel(): Locator {
    return this.page.getByText(/^(Gold|Silver|Bronze|Unaffiliated) Community$/);
  }

  /** "Valid until · Jun 2027"; absent for a community without a running tier. */
  get tierExpiry(): Locator {
    return this.page.getByText(/^Valid until · /);
  }

  // ---- tabs ------------------------------------------------------------------

  tab(tab: CommunityTab): Locator {
    return this.page.getByRole("tab", { name: TAB_NAME[tab], exact: typeof TAB_NAME[tab] === "string" });
  }

  async openTab(tab: CommunityTab) {
    await this.tab(tab).click();
    await expect(this.tab(tab)).toHaveAttribute("aria-selected", "true");
  }

  // ---- Overview --------------------------------------------------------------

  get aboutHeading(): Locator {
    return this.page.getByText("About", { exact: true });
  }

  get recentActivityHeading(): Locator {
    return this.page.getByText("Recent Activity", { exact: true });
  }

  /** The entries of Recent Activity, newest first. Each has data-activity-type, the subgraph's type name. */
  get activityRows(): Locator {
    return this.page.getByTestId("community-activity-row");
  }

  activityRow(type: string): Locator {
    return this.page.locator(`[data-testid="community-activity-row"][data-activity-type="${type}"]`);
  }

  /** The link to the block explorer at the end of an activity row. */
  activityTransactionLink(row: Locator): Locator {
    return row.getByRole("link", { name: "View transaction on explorer" });
  }

  get loadMoreActivitiesButton(): Locator {
    return this.page.getByRole("button", { name: "Load more activities" });
  }

  get noActivity(): Locator {
    return this.page.getByText("No recent activity.", { exact: true });
  }

  /** Subgraph type names of the activity rows on screen, in order. */
  async activityTypes(): Promise<string[]> {
    return this.activityRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-activity-type") ?? ""));
  }

  // ---- Members ---------------------------------------------------------------

  get membersTable(): Locator {
    return this.page.getByRole("table", { name: "Community members" });
  }

  /** "Member", "Joined" and, for the manager, "Actions". */
  get memberColumnHeaders(): Locator {
    return this.membersTable.getByRole("columnheader");
  }

  /** The member rows on screen, in order. */
  get memberRows(): Locator {
    return this.page.getByTestId("community-member-row");
  }

  memberRow(address: string): Locator {
    return this.page.locator(`[data-testid="community-member-row"][data-address="${address.toLowerCase()}"]`);
  }

  /** Addresses of the member rows on screen, lowercase, in order. */
  async memberAddresses(): Promise<string[]> {
    return this.memberRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-address") ?? ""));
  }

  /** "Revoke" at the end of a member's row (the manager only). Reads "Revoking..." while it works. */
  revokeButton(row: Locator): Locator {
    return row.getByRole("button", { name: /^Revok(e|ing\.\.\.)$/ });
  }

  get membersSearchInput(): Locator {
    return this.page.getByPlaceholder("Search by name or address...");
  }

  /**
   * The "Sort by" select of the Members tab; its text is the current choice.
   * MUI puts the Select's aria-label on the wrapper, not on the combobox.
   */
  get membersSortSelect(): Locator {
    return this.page.locator('[aria-label="Sort by"]').getByRole("combobox");
  }

  async sortMembersBy(choice: MemberSort) {
    await this.membersSortSelect.click();
    await this.page.getByRole("option", { name: choice, exact: true }).click();
    await expect(this.membersSortSelect).toHaveText(choice);
  }

  get previousPageButton(): Locator {
    return this.page.getByRole("button", { name: "Previous", exact: true });
  }

  get nextPageButton(): Locator {
    return this.page.getByRole("button", { name: "Next", exact: true });
  }

  /** The number button of a page; MUI names it "page 2" when current and "Go to page 2" otherwise. */
  pageButton(page: number): Locator {
    return this.page.getByRole("button", { name: new RegExp(`^(Go to )?page ${page}$`) });
  }

  /** "Load more" under the results of a member search. */
  get loadMoreMembersButton(): Locator {
    return this.page.getByRole("button", { name: "Load more", exact: true });
  }

  get noMembers(): Locator {
    return this.page.getByText("No members found.", { exact: true });
  }

  get noMembersMatch(): Locator {
    return this.page.getByText("No members match your search.", { exact: true });
  }

  // ---- Members: the manager's badge-actions panel ------------------------------

  /** The panel next to the members table: a badge picker and the Mint / Burn / Transfer tabs. */
  get badgeActions(): Locator {
    return this.page.getByTestId("community-badge-actions");
  }

  /**
   * The panel's badge picker: its text input. It is the first control of
   * the panel; the recipient and holder pickers of the action tabs come
   * after it.
   */
  get badgePickerInput(): Locator {
    return this.badgeActions.getByRole("combobox").first();
  }

  /** An entry of an open picker's dropdown, by a text it shows. */
  pickerOption(text: string): Locator {
    return this.page.getByRole("option").filter({ hasText: text });
  }

  get badgeActionTabs(): Locator {
    return this.badgeActions.getByRole("tablist", { name: "badge actions" });
  }

  badgeActionTab(name: "Mint" | "Transfer" | "Burn"): Locator {
    return this.badgeActionTabs.getByRole("tab", { name, exact: true });
  }

  /** Searches the badge picker for `name` and chooses the badge with that name. */
  async pickBadge(name: string) {
    await this.badgePickerInput.fill(name);
    await this.pickerOption(name).click();
    await expect(this.badgeActions).toContainText(name);
  }

  /** The holder picker of the Burn tab, while nobody is chosen. */
  get burnHolderInput(): Locator {
    return this.badgeActions.getByPlaceholder("Search users by name or ID or enter an address...");
  }

  get burnConfirmCheckbox(): Locator {
    return this.badgeActions.getByLabel("I understand this action cannot be undone.");
  }

  /** "Burn Badge"; reads "Simulating..." and "Burning..." while it works. */
  get burnSubmit(): Locator {
    return this.badgeActions.getByRole("button", { name: /^(Burn Badge|Simulating\.\.\.|Burning\.\.\.)$/ });
  }

  // ---- Badges ----------------------------------------------------------------

  /** The community's badges on the Badges tab. */
  get badgeCards(): Locator {
    return this.page.getByTestId("community-badge");
  }

  badgeCard(badgeId: string | bigint | number): Locator {
    return this.page.locator(`[data-testid="community-badge"][data-badge-id="${badgeId}"]`);
  }

  /** Badge ids of the cards on the Badges tab, in order. */
  async badgeIds(): Promise<string[]> {
    return this.badgeCards.evaluateAll((cards) => cards.map((card) => card.getAttribute("data-badge-id") ?? ""));
  }

  /** The manager's "Create Badge" on the Badges tab. */
  get createBadgeLink(): Locator {
    return this.page.getByRole("link", { name: "Create Badge" });
  }

  get noBadges(): Locator {
    return this.page.getByText("No badges found", { exact: true });
  }

  // ---- Governance ------------------------------------------------------------

  /** The placeholder's headline (the tab's own chip reads "Coming Soon", with a capital S). */
  get governanceComingSoon(): Locator {
    return this.page.getByText("Coming soon", { exact: true });
  }

  // ---- Settings --------------------------------------------------------------

  get generalInformation(): Locator {
    return this.page.getByText("General Information", { exact: true });
  }

  get badgeModifications(): Locator {
    return this.page.getByText("Badge Modifications", { exact: true });
  }

  get editInfoButton(): Locator {
    return this.page.getByRole("button", { name: "Edit community info" });
  }

  editBadgeButton(role: CommunityBadgeRole): Locator {
    return this.page.getByRole("button", { name: `Edit ${role} badge`, exact: true });
  }

  /** "Transfer Ownership" in the Danger Zone. */
  get transferOwnershipButton(): Locator {
    return this.page.getByRole("button", { name: "Transfer community ownership" });
  }

  /** The open dialog with this title: "Edit Community Info", "Edit Member Badge", "Transfer Ownership". */
  dialog(title: string): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: title }) });
  }

  /** "Save Changes" of an edit dialog; reads "Uploading..." and "Saving..." while it works. */
  saveButton(dialog: Locator): Locator {
    return dialog.getByRole("button", { name: /^(Save Changes|Uploading\.\.\.|Saving\.\.\.)$/ });
  }

  /** The red button of the Transfer Ownership dialog; reads "Transferring..." while it works. */
  transferSubmit(dialog: Locator): Locator {
    return dialog.getByRole("button", { name: /^(Transfer Ownership|Transferring\.\.\.)$/ });
  }
}
