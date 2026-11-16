import { expect, type Locator, type Page } from "@playwright/test";

/** /profile for someone without a profile: the setup prompt and the two-step wizard. */
export class OnboardingPage {
  constructor(readonly page: Page) {}

  get setupPrompt(): Locator {
    return this.page.getByTestId("onboarding-setup-prompt");
  }

  get startButton(): Locator {
    return this.page.getByTestId("onboarding-start");
  }

  get form(): Locator {
    return this.page.getByTestId("onboarding-form");
  }

  get nameInput(): Locator {
    return this.page.getByTestId("onboarding-name-input");
  }

  get bioInput(): Locator {
    return this.page.getByTestId("onboarding-bio-input");
  }

  get review(): Locator {
    return this.page.getByTestId("onboarding-review");
  }

  get nextButton(): Locator {
    return this.page.getByTestId("onboarding-next");
  }

  get backButton(): Locator {
    return this.page.getByTestId("onboarding-back");
  }

  /** "Finish" on the review step: uploads the metadata, then sends the profile call. */
  get submitButton(): Locator {
    return this.page.getByTestId("onboarding-submit");
  }

  /** "Account details 0x1234...abcd" above the form: the Society address the profile will belong to. */
  get accountHeading(): Locator {
    return this.form.getByRole("heading", { name: /^Account details/ });
  }

  /** The hidden file input behind "Upload photo". */
  get avatarFileInput(): Locator {
    return this.page.getByTestId("avatar-input-file");
  }

  /** The avatar above the form; `avatarImage` is the picture in it. */
  get avatarPreview(): Locator {
    return this.page.getByTestId("avatar-input-preview");
  }

  get avatarImage(): Locator {
    return this.avatarPreview.getByRole("img");
  }

  /** The validation message under the avatar buttons; absent while the avatar is valid. */
  get avatarMessage(): Locator {
    return this.page.getByTestId("avatar-input-message");
  }

  get removePhotoButton(): Locator {
    return this.page.getByRole("button", { name: "Remove Photo" });
  }

  /** The avatar on the review card. */
  get reviewAvatar(): Locator {
    return this.review.getByLabel(/^Avatar for 0x/);
  }

  /** The profile view that replaces the wizard once the profile exists. */
  get profileDetails(): Locator {
    return this.page.getByTestId("profile-details");
  }

  async open() {
    await this.page.goto("/profile");
  }

  /**
   * From the setup prompt into the wizard's first step, with one click.
   *
   * When the identity the page shows goes away (disconnect, account
   * switch), `Profile.tsx` resets `setupOpen` through nuqs, whose URL write
   * lands up to about 150 ms later, on whatever the URL is then. A click in
   * that gap would be undone (before the C16 fix, connecting did this too).
   * A user who clicks once the page has settled is not affected, so this
   * waits for that first (`waitForUrlWritesToSettle`) and then clicks once,
   * with no second try: a change that undoes a settled click fails here.
   * After the click it waits for the URL writes again and checks that the
   * wizard is still open, so a reset that lands after the form appeared
   * fails here too, and not in the next step.
   */
  async start() {
    await this.waitForUrlWritesToSettle();
    await this.startButton.click();
    await expect(this.form).toBeVisible();
    await expect(this.page).toHaveURL(/[?&]setupOpen=true/);
    await this.waitForUrlWritesToSettle();
    await expect(this.form).toBeVisible();
    await expect(this.page).toHaveURL(/[?&]setupOpen=true/);
  }

  /**
   * Waits until nuqs has no URL write pending and has written none for
   * `quietMs`, so that a reset the page has queued (the wallet's identity
   * changed) has landed before the test acts. Reads nuqs's own throttle
   * queue, a global singleton (`Symbol.for("nuqs.<version>.throttle-queue")`
   * on globalThis, nuqs 2.x): `resolvers` is set from the moment a write is
   * queued until it is applied, `lastFlushedAt` is the `performance.now()` of
   * the last one. The quiet period also covers a React effect that runs a
   * little after the render the test saw.
   */
  async waitForUrlWritesToSettle(quietMs = 300) {
    const token = Math.random().toString(36).slice(2);
    await this.page.waitForFunction(
      ({ quiet, token }) => {
        const key = Object.getOwnPropertySymbols(globalThis).find((symbol) =>
          /^nuqs\..+\.throttle-queue$/.test(symbol.description ?? ""),
        );
        const state = window as unknown as { __e2eUrlIdle?: { token: string; since: number } };
        if (!key) {
          if (document.readyState === "complete") {
            throw new Error(
              "nuqs's throttle queue is not on globalThis: nuqs changed, update OnboardingPage.waitForUrlWritesToSettle",
            );
          }
          return false;
        }
        const queue = (globalThis as unknown as Record<symbol, { resolvers: unknown; lastFlushedAt: number }>)[key];
        const now = performance.now();
        if (queue.resolvers) {
          state.__e2eUrlIdle = undefined;
          return false;
        }
        if (state.__e2eUrlIdle?.token !== token) state.__e2eUrlIdle = { token, since: now };
        return now - state.__e2eUrlIdle.since >= quiet && now - queue.lastFlushedAt >= quiet;
      },
      { quiet: quietMs, token },
      { polling: 25 },
    );
  }

  async fill(profile: { name: string; bio?: string }) {
    await this.nameInput.fill(profile.name);
    if (profile.bio !== undefined) await this.bioInput.fill(profile.bio);
  }

  /** Account Info -> Review. */
  async toReview() {
    await this.nextButton.click();
    await expect(this.review).toBeVisible();
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Picks a file as "Upload photo" does, without the file dialog. */
  async chooseAvatar(file: { name: string; mimeType: string; buffer: Buffer }) {
    await this.avatarFileInput.setInputFiles(file);
  }
}
