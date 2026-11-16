import type { Locator, Page } from "@playwright/test";

/** /create-badge: the two-step wizard (Badge Info, Permissions) that creates a badge. */
export class BadgeCreatePage {
  constructor(readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Create New Badge" });
  }

  get nameInput(): Locator {
    return this.page.getByLabel("Badge Name");
  }

  /** Badge Info -> Permissions. */
  get nextButton(): Locator {
    return this.page.getByRole("button", { name: "Next", exact: true });
  }

  /**
   * "Finish" on the Permissions step: pins the metadata if there is any,
   * then sends createBadge. While it works its label changes, so this
   * locator only finds the button at rest.
   */
  get finishButton(): Locator {
    return this.page.getByRole("button", { name: "Finish", exact: true });
  }

  async open() {
    await this.page.goto("/create-badge");
  }

  /** Fills in the name and goes on to the Permissions step, whose defaults are valid. */
  async toPermissions(name: string) {
    await this.nameInput.fill(name);
    await this.nextButton.click();
    await this.finishButton.waitFor();
  }
}
