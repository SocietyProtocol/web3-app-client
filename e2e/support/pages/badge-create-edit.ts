import type { Locator, Page } from "@playwright/test";

/**
 * Managing a badge: the "Manage" button of /badges/<id> and the edit form
 * it opens (/badges/<id>?edit=true), which only a manager of the badge gets.
 */
export class BadgeEditForm {
  constructor(readonly page: Page) {}

  // ---- the detail page -----------------------------------------------------

  /** The badge's name as the title of the detail page. The edit form has no level-1 heading. */
  detailTitle(badgeName: string): Locator {
    return this.page.getByRole("heading", { level: 1, name: badgeName, exact: true });
  }

  /** "Manage" on the detail page: only there for a manager of the badge. */
  get manageButton(): Locator {
    return this.page.getByRole("button", { name: "Manage", exact: true });
  }

  /** The badge's picture on the detail page (its alt text is the badge's name). */
  detailImage(badgeName: string): Locator {
    return this.page.getByRole("img", { name: badgeName, exact: true });
  }

  // ---- the edit form -------------------------------------------------------

  /** "Edit Badge: <name>". */
  get heading(): Locator {
    return this.page.getByRole("heading", { name: /^Edit Badge:/ });
  }

  get nameInput(): Locator {
    return this.page.getByLabel("Badge Name");
  }

  get metadataInput(): Locator {
    return this.page.getByLabel("Metadata (JSON)");
  }

  /** The hidden file input behind "Upload photo". */
  get imageFileInput(): Locator {
    return this.page.getByTestId("avatar-input-file");
  }

  get imagePreview(): Locator {
    return this.page.getByTestId("avatar-input-preview");
  }

  get officialCheckbox(): Locator {
    return this.page.getByRole("checkbox", { name: /^Official Badge/ });
  }

  get cancelButton(): Locator {
    return this.page.getByRole("button", { name: "Cancel", exact: true });
  }

  /** "Update Badge". While it works its label changes, so this only finds the button at rest. */
  get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Update Badge", exact: true });
  }

  // ---- actions -------------------------------------------------------------

  /** Opens the detail page, or the edit form straight away with `edit`. */
  async open(badgeId: bigint | string, options: { edit?: boolean } = {}) {
    await this.page.goto(`/badges/${badgeId}${options.edit ? "?edit=true" : ""}`);
  }

  async chooseImage(file: { name: string; mimeType: string; buffer: Buffer }) {
    await this.imageFileInput.setInputFiles(file);
  }
}
