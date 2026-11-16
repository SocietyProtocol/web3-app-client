import type { Locator, Page } from "@playwright/test";

export type BadgePermissionLabel = "Who can Mint:" | "Who can Burn:" | "Who can Transfer:";

/**
 * /badges/<id>: what the page says about the badge itself (image, id,
 * name, description, metadata, creator), who may do what with it, and the
 * Actions area. The holders and the Mint tab are in BadgePage (badge.ts).
 */
export class BadgeDetailPanel {
  constructor(readonly page: Page) {}

  /** The badge's name: the page's only level-one heading. */
  get name(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  /** The "ID: #<id>" chip. */
  idChip(badgeId: bigint | string): Locator {
    return this.page.getByText(`ID: #${badgeId}`, { exact: true });
  }

  /** The badge's picture; its alternative text is the badge's name. */
  image(badgeName: string): Locator {
    return this.page.getByRole("img", { name: badgeName, exact: true });
  }

  get metadataLink(): Locator {
    return this.page.getByRole("link", { name: "View Metadata" });
  }

  /** The creator's tag under the description; it links to their profile. */
  get creatorLink(): Locator {
    return this.page.getByTestId("badge-creator").getByRole("link");
  }

  /** "Manage", shown to the badge's managers only. */
  get manageButton(): Locator {
    return this.page.getByTestId("badge-creator").getByRole("button", { name: "Manage" });
  }

  /** One of the three "Who can ..." rows. */
  permission(label: BadgePermissionLabel): Locator {
    return this.page.getByTestId("badge-permission").filter({ hasText: label });
  }

  /**
   * A badge named in a permission row. Its link is labelled
   * `View badge “<label>” (ID #<id>)`, where the label is the badge's name,
   * or "User (<name>)" for a member's profile badge.
   */
  permissionBadge(row: Locator, badgeId: bigint | string): Locator {
    return row.getByRole("link", { name: new RegExp(`\\(ID #${badgeId}\\)$`) });
  }

  /** The "Who can Manage:" row. */
  get managers(): Locator {
    return this.page.getByTestId("badge-managers");
  }

  /** A manager named in the "Who can Manage:" row: a link to their profile. */
  manager(name: string): Locator {
    return this.managers.getByRole("link", { name: `User profile link for ${name}`, exact: true });
  }

  /** The Actions area: its title, and the Mint / Transfer / Burn tabs when the visitor may act. */
  get actions(): Locator {
    return this.page.getByTestId("badge-actions");
  }

  /** The Mint / Transfer / Burn tabs, not the Single / Batch tabs inside the Mint tab. */
  get actionTabs(): Locator {
    return this.page.getByRole("tablist", { name: "badge actions" }).getByRole("tab");
  }

  /** The prompt to connect a wallet, inside the Actions area. */
  get actionsConnectPrompt(): Locator {
    return this.actions.getByTestId("wallet-connect-prompt");
  }

  /** The prompt to switch network, inside the Actions area. */
  get actionsWrongNetworkPrompt(): Locator {
    return this.actions.getByTestId("wallet-wrong-network");
  }
}
