import { expect, type Locator, type Page } from "@playwright/test";

/**
 * /referrals: the intro, the two forms (accept an invitation, generate a
 * referral code) and the FAQ. The accept form is only there while the
 * connected account has not been referred by anyone.
 *
 * After `pages.shell.connect()` the forms are in their final state: the
 * header shows the account button only once the Society address is known
 * and its User query has loaded, and the forms wait for the same query.
 */
export class ReferralsPage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto("/referrals");
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Referral Program", level: 1 });
  }

  /** "Back" above the page: to where the visitor came from, or to /profile. */
  get backButton(): Locator {
    return this.page.getByRole("button", { name: "Go back" });
  }

  /** A question of the FAQ: a button that opens its answer. */
  faqQuestion(question: string): Locator {
    return this.page.getByRole("button", { name: question });
  }

  // ---- accept an invitation -------------------------------------------------

  /** The accept form: the code field with its Paste / Clear button, the simulation error and "Accept Invitation". */
  get acceptForm(): Locator {
    return this.page.getByTestId("referrals-accept-form");
  }

  get codeInput(): Locator {
    return this.acceptForm.getByPlaceholder("Paste or enter a referral code");
  }

  /** In the code field while it is empty. */
  get codePasteButton(): Locator {
    return this.acceptForm.getByTitle("Paste");
  }

  /** In the code field once it holds something. */
  get codeClearButton(): Locator {
    return this.acceptForm.getByTitle("Clear");
  }

  /**
   * "Accept Invitation". While the app works the button is named
   * "Loading...", "Simulating..." or "Accepting...", so an assertion on this
   * locator waits for the app to be done.
   */
  get acceptButton(): Locator {
    return this.acceptForm.getByRole("button", { name: "Accept Invitation", exact: true });
  }

  /** The alert that says why accepting this code would fail on chain. */
  get simulationError(): Locator {
    return this.acceptForm.getByTestId("transaction-simulation-error");
  }

  /** A message under the code field. */
  codeMessage(text: string | RegExp): Locator {
    return this.acceptForm.getByText(text);
  }

  // ---- generate a referral code ---------------------------------------------

  /** The invitee field: the input, its Paste / Clear button and the message under it. */
  get addressField(): Locator {
    return this.page.getByTestId("referrals-generate-address");
  }

  get addressInput(): Locator {
    return this.addressField.getByPlaceholder("Paste or enter an address");
  }

  get addressPasteButton(): Locator {
    return this.addressField.getByTitle("Paste");
  }

  get addressClearButton(): Locator {
    return this.addressField.getByTitle("Clear");
  }

  /** A message under the invitee field. */
  addressMessage(text: string | RegExp): Locator {
    return this.addressField.getByText(text);
  }

  /** "Generate"; named "Signing..." while the wallet is asked. It gives way to the code. */
  get generateButton(): Locator {
    return this.page.getByRole("button", { name: "Generate", exact: true });
  }

  /** "Share this Referral Code:" with the code, its copy button and its expiry. */
  get generated(): Locator {
    return this.page.getByTestId("referrals-generated");
  }

  get generatedCode(): Locator {
    return this.page.getByTestId("referrals-generated-code");
  }

  /** The copy button next to the code (it has no name; it is the block's only button). */
  get copyCodeButton(): Locator {
    return this.generated.getByRole("button");
  }

  /** "Expires 13 Nov 2026" */
  get generatedExpiry(): Locator {
    return this.generated.getByText(/^Expires /);
  }

  /** Enters the invitee and asks the wallet to sign; returns the code the page then shows. */
  async generateFor(invitee: string): Promise<string> {
    await this.addressInput.fill(invitee);
    await expect(this.generateButton).toBeEnabled();
    await this.generateButton.click();
    await expect(this.generatedCode).toBeVisible();
    return ((await this.generatedCode.textContent()) ?? "").trim();
  }
}
