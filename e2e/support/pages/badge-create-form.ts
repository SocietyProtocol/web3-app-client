import type { Locator } from "@playwright/test";
import { BadgeCreatePage } from "./badge-create";

export type PermissionField = "minters" | "burners" | "transferers";

/**
 * The whole badge wizard (/create-badge and /communities/<id>/create-badge):
 * what BadgeCreatePage has, plus the rest of the Badge Info step (image,
 * metadata, "Official Badge"), the pickers of the Permissions step and the
 * preview card next to the wizard.
 */
export class BadgeCreateForm extends BadgeCreatePage {
  // ---- Badge Info ----------------------------------------------------------

  get metadataInput(): Locator {
    return this.page.getByLabel("Metadata (JSON)");
  }

  /** The hidden file input behind "Upload photo". */
  get imageFileInput(): Locator {
    return this.page.getByTestId("avatar-input-file");
  }

  /** The picture above the form; `image` is the <img> in it. */
  get imagePreview(): Locator {
    return this.page.getByTestId("avatar-input-preview");
  }

  get image(): Locator {
    return this.imagePreview.getByRole("img");
  }

  /** The validation message under the image buttons; absent while the image is valid. */
  get imageMessage(): Locator {
    return this.page.getByTestId("avatar-input-message");
  }

  get removePhotoButton(): Locator {
    return this.page.getByRole("button", { name: "Remove Photo" });
  }

  /** "Official Badge": only there for a holder of OFFICIAL_BADGE_CREATOR_ROLE. */
  get officialCheckbox(): Locator {
    return this.page.getByRole("checkbox", { name: /^Official Badge/ });
  }

  /** Permissions -> Badge Info. (The page's own back button is named "Go back".) */
  get backButton(): Locator {
    return this.page.getByRole("button", { name: "Back", exact: true });
  }

  /** The Finish button whatever it says: "Finish" at rest, "Uploading...", "Confirming transaction...", "Syncing..." while it works. */
  get finishOrBusyButton(): Locator {
    return this.page.getByRole("button", {
      name: /^(Finish|Uploading\.\.\.|Confirming transaction\.\.\.|Syncing\.\.\.|Executing transaction\.\.\.|Saving\.\.\.)$/,
    });
  }

  // ---- Permissions ---------------------------------------------------------

  /** The search field of "Who can Mint / Burn / Transfer". */
  permissionInput(field: PermissionField): Locator {
    return this.page.getByTestId(`badge-create-${field}-input`);
  }

  /** The search field of "Who can Manage" (not there for a community badge). */
  get editorsInput(): Locator {
    return this.page.getByTestId("badge-create-editors-input");
  }

  /** The heading of a section of the Permissions step, e.g. "Who can Manage:". */
  permissionLabel(label: "Who can Mint:" | "Who can Burn:" | "Who can Transfer:" | "Who can Manage:"): Locator {
    return this.page.getByText(label, { exact: true });
  }

  /** An entry of an open picker, by the text it shows. */
  option(text: string): Locator {
    return this.page.getByRole("option").filter({ hasText: text });
  }

  // ---- Preview -------------------------------------------------------------

  /** The preview card next to the wizard (shown from the md breakpoint up). */
  get preview(): Locator {
    return this.page.locator('[data-testid="badge-card"][data-badge-id="(Preview)"]');
  }

  // ---- actions -------------------------------------------------------------

  async openForCommunity(communityId: bigint | string) {
    await this.page.goto(`/communities/${communityId}/create-badge`);
  }

  /** Picks a file as "Upload photo" does, without the file dialog. */
  async chooseImage(file: { name: string; mimeType: string; buffer: Buffer }) {
    await this.imageFileInput.setInputFiles(file);
  }

  /** Searches a badge picker and chooses the entry that shows `optionText`. */
  async pickPermissionBadge(field: PermissionField, search: string, optionText = search) {
    await this.permissionInput(field).fill(search);
    await this.option(optionText).click();
  }

  /** Types an address into "Who can Manage" and confirms it. */
  async addEditor(address: string) {
    await this.editorsInput.fill(address);
    await this.editorsInput.press("Enter");
  }
}
