import { expect, type Locator, type Page } from "@playwright/test";
import { BadgeCardSection } from "./badge-cards";

/** A member's profile: /profile for the connected member, /user/<address> for anyone else. */
export class ProfilePage {
  /** "Badges held by <name>": the first cards, "View All Badges" and its modal. */
  readonly badges: BadgeCardSection;

  constructor(readonly page: Page) {
    this.badges = new BadgeCardSection(
      page.getByTestId("profile-badges"),
      page.getByTestId("profile-badges-modal"),
      "View All Badges",
    );
  }

  /** The profile as shown, not the edit form. */
  get details(): Locator {
    return this.page.getByTestId("profile-details");
  }

  /**
   * The grey placeholder of /profile and /user/<address> while the page
   * waits for wagmi (or the User query) before it decides what to show.
   */
  get skeleton(): Locator {
    return this.page.getByTestId("account-skeleton");
  }

  /** "Edit" on the member's own card. */
  get editButton(): Locator {
    return this.details.getByRole("button", { name: "Edit" });
  }

  /** The edit form (/profile?edit=true): avatar, name, bio, Cancel and "Update Profile". */
  get editForm(): Locator {
    return this.page.getByTestId("profile-edit-form");
  }

  get editNameInput(): Locator {
    return this.editForm.getByLabel("Name");
  }

  get editBioInput(): Locator {
    return this.editForm.getByLabel("Bio");
  }

  /** "Update Profile": uploads the metadata, then sends updateProfileURI. */
  get saveButton(): Locator {
    return this.editForm.getByRole("button", { name: "Update Profile" });
  }

  /**
   * The same button by its test id, which it keeps while its text says
   * what it waits for ("Uploading to IPFS...", "Signing transaction...").
   */
  get submitButton(): Locator {
    return this.page.getByTestId("profile-edit-submit");
  }

  get cancelButton(): Locator {
    return this.editForm.getByRole("button", { name: "Cancel" });
  }

  /** From the profile into its edit form. */
  async startEditing() {
    await this.editButton.click();
    await expect(this.editForm).toBeVisible();
  }

  /** The connected member's own profile. */
  async open() {
    await this.page.goto("/profile");
  }

  /** Someone else's public profile. */
  async openUser(address: string) {
    await this.page.goto(`/user/${address.toLowerCase()}`);
  }
}
