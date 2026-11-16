import { expect, type Locator, type Page } from "@playwright/test";

export type CommunityBadgeKind = "Manager" | "Assistant" | "Member";

/**
 * /create-community: the three-step wizard (Community Info, Badge Details,
 * Review) that creates a community, and the "Community Created!" screen
 * that replaces it afterwards.
 *
 * Not in `pages` of e2e/fixtures.ts yet: make one with `new CommunityCreatePage(page)`.
 */
export class CommunityCreatePage {
  constructor(readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Create Community", exact: true, level: 1 });
  }

  // ---- step 1: Community Info ------------------------------------------------

  get nameInput(): Locator {
    return this.page.getByLabel("Community Name", { exact: true });
  }

  get descriptionInput(): Locator {
    return this.page.getByLabel("Description", { exact: true });
  }

  /** "Community name is required" and the like, under the name field. */
  nameError(message: string): Locator {
    return this.page.getByText(message, { exact: true });
  }

  /**
   * The hidden file inputs behind "Upload photo", in the order of the step:
   * one on Community Info (the logo), two on Badge Details (assistant, member).
   */
  get imageFileInputs(): Locator {
    return this.page.getByTestId("avatar-input-file");
  }

  get imagePreviews(): Locator {
    return this.page.getByTestId("avatar-input-preview");
  }

  /** The text under an image field: its hint, or what is wrong with the chosen file. */
  get imageMessages(): Locator {
    return this.page.getByTestId("avatar-input-message");
  }

  // ---- step 2: Badge Details -------------------------------------------------

  /** The "… Badge Metadata (JSON)" field of one of the three badges. */
  metadataInput(badge: CommunityBadgeKind): Locator {
    return this.page.getByLabel(`${badge} Badge Metadata (JSON)`, { exact: true });
  }

  /** The step's introduction; tells Badge Details apart from the other steps. */
  get badgeDetailsIntro(): Locator {
    return this.page.getByText("Customize the badges that will be minted for your community", { exact: true });
  }

  // ---- step 3: Review --------------------------------------------------------

  get reviewIntro(): Locator {
    return this.page.getByText("Review your community details before submitting", { exact: true });
  }

  get reviewNote(): Locator {
    return this.page.getByText(/^Submitting will upload metadata to IPFS and prompt you to sign a\s+transaction to create the community on-chain\.$/);
  }

  // ---- navigation ------------------------------------------------------------

  get nextButton(): Locator {
    return this.page.getByRole("button", { name: "Next", exact: true });
  }

  /** The wizard's own Back (the page's back arrow is named "Go back"). */
  get backButton(): Locator {
    return this.page.getByRole("button", { name: "Back", exact: true });
  }

  /**
   * "Finish" on the Review step: signs the upload, pins the three badges'
   * metadata, then sends createCommunity. While it works its label changes
   * ("Uploading...", "Executing transaction...", "Syncing..."), so this
   * locator only finds the button at rest.
   */
  get finishButton(): Locator {
    return this.page.getByRole("button", { name: "Finish", exact: true });
  }

  // ---- afterwards ------------------------------------------------------------

  get createdHeading(): Locator {
    return this.page.getByRole("heading", { name: "Community Created!" });
  }

  get viewCommunityLink(): Locator {
    return this.page.getByRole("link", { name: "View Community" });
  }

  get viewTransactionLink(): Locator {
    return this.page.getByRole("link", { name: "View Transaction" });
  }

  async open() {
    await this.page.goto("/create-community");
  }

  /** Fills in step 1 and goes on to Badge Details. */
  async toBadgeDetails(input: { name: string; description: string }) {
    await this.nameInput.fill(input.name);
    await this.descriptionInput.fill(input.description);
    await this.nextButton.click();
    await expect(this.badgeDetailsIntro).toBeVisible();
  }

  /** Badge Details -> Review. */
  async toReview() {
    await this.nextButton.click();
    await expect(this.reviewIntro).toBeVisible();
  }

  /** Steps 1 and 2 with nothing but the required name and description, up to Review. */
  async fillToReview(input: { name: string; description: string }) {
    await this.toBadgeDetails(input);
    await this.toReview();
    await expect(this.finishButton).toBeEnabled();
  }
}
