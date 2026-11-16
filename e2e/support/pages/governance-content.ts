import type { Locator, Page } from "@playwright/test";

/**
 * The parts of governance that are not the list of Governors (that list is
 * in governance.ts): the text and the two Snapshot links of /governance,
 * and the "Governance" tab of a community, which is a placeholder for now.
 *
 * Not part of the `pages` fixture: make one with `new GovernanceContent(page)`.
 */
export class GovernanceContent {
  constructor(readonly page: Page) {}

  // ---- /governance ----------------------------------------------------------

  /** The page's own heading (the card next to the text is headed "Governance" as well, one level down). */
  get heading(): Locator {
    return this.page.getByRole("heading", { level: 1, name: "Governance" });
  }

  /** "Check Snapshot →": the Governors' Snapshot space. */
  get snapshotLink(): Locator {
    return this.page.getByRole("link", { name: "Check Snapshot →" });
  }

  /** "SPEC Token Snapshot →": the SPEC holders' Snapshot space. */
  get specSnapshotLink(): Locator {
    return this.page.getByRole("link", { name: "SPEC Token Snapshot →" });
  }

  /** A link inside the text, by the words it is on. */
  textLink(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  /** Shown in place of the text when it could not be fetched. */
  get textFailed(): Locator {
    return this.page.getByText("Failed to load content.");
  }

  // ---- /communities/<id>?tab=governance -------------------------------------

  async openCommunity(id: string | bigint, tab?: "governance") {
    await this.page.goto(`/communities/${id}${tab ? `?tab=${tab}` : ""}`);
  }

  /** The community's "Governance" tab, which carries a "Coming Soon" chip. */
  get communityTab(): Locator {
    return this.page.getByRole("tab", { name: /^Governance/ });
  }

  communityTabNamed(name: string): Locator {
    return this.page.getByRole("tab", { name, exact: true });
  }

  /** The placeholder's headline. */
  get comingSoon(): Locator {
    return this.page.getByRole("heading", { name: "Coming soon", exact: true });
  }

  get stayTuned(): Locator {
    return this.page.getByText("Stay tuned for updates");
  }

  get xLink(): Locator {
    return this.page.getByRole("link", { name: "Follow Society Protocol on X" });
  }

  get discordLink(): Locator {
    return this.page.getByRole("link", { name: "Join Society Protocol on Discord" });
  }
}
