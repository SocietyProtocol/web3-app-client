import { expect, test } from "../../fixtures";
import { cidOf } from "../../support/backends/s3";
import { expectSponsoredThroughAccount } from "../../support/write-route";
import { openWizard } from "../../support/flows/onboarding";

/** A valid 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const TWO_MEGABYTES = 2 * 1024 * 1024;

test.describe("smart-account onboarding: the form", () => {
  test(
    "C5: a chosen avatar is previewed, pinned as an image and shown on the profile",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain, s3 }) => {
      const me = await openWizard({ persona, pages });
      const name = `Pixel ${me.address.slice(2, 8)}`;

      // No picture yet: the placeholder, and nothing to remove.
      await expect(pages.onboarding.avatarPreview).toHaveAttribute("data-has-image", "false");
      await expect(pages.onboarding.removePhotoButton).toBeDisabled();

      await pages.onboarding.chooseAvatar({ name: "avatar.png", mimeType: "image/png", buffer: PNG });
      await expect(pages.onboarding.avatarPreview).toHaveAttribute("data-has-image", "true");
      await expect(pages.onboarding.avatarImage).toHaveAttribute("src", /^data:image\/png;base64,/);
      await expect(pages.onboarding.avatarImage).toHaveJSProperty("naturalWidth", 1);
      await expect(pages.onboarding.avatarMessage).toBeHidden();
      await expect(pages.onboarding.removePhotoButton).toBeEnabled();

      await pages.onboarding.fill({ name });
      await pages.onboarding.toReview();
      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText(name);

      await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );

      // The picture was pinned by itself, and the metadata on chain points at
      // it by URL: the image bytes are not inlined into the profile.
      const badgeId = await chain.profileBadgeId(me.address);
      expect(badgeId).toBeGreaterThan(BigInt(0));
      const metadata = await s3.getJson<{ name: string; imageUrl: string }>(cidOf(await chain.read("uri", [badgeId])));
      expect(metadata).toMatchObject({ name });
      expect(metadata!.imageUrl).toMatch(/^https:\/\/.+\/ipfs\/[a-z0-9]+$/);
      expect((await s3.get(cidOf(metadata!.imageUrl)))?.equals(PNG), "the pinned image is the chosen file").toBe(true);
      expect((await s3.requests()).filter((request) => request.method === "PUT")).toHaveLength(2);

      // The profile shows that picture, loaded from the gateway.
      const picture = pages.profile.details.getByLabel(`Avatar for ${me.address}`).getByRole("img");
      await expect(picture).toHaveAttribute("src", metadata!.imageUrl);
      await expect(picture).toHaveJSProperty("naturalWidth", 1);
    },
  );

  test("C5: the review step shows the chosen avatar", { tag: ["@core"] }, async ({ persona, pages }) => {
    await openWizard({ persona, pages });
    await pages.onboarding.chooseAvatar({ name: "avatar.png", mimeType: "image/png", buffer: PNG });
    await expect(pages.onboarding.avatarImage).toHaveJSProperty("naturalWidth", 1);
    await pages.onboarding.fill({ name: "Pixel" });
    await pages.onboarding.toReview();
    await expect(pages.onboarding.review).toContainText("Pixel");
    await expect(pages.onboarding.reviewAvatar).toBeVisible();

    // The review card shows the picture that was just chosen, not the
    // coloured placeholder.
    await expect(pages.onboarding.reviewAvatar.getByRole("img")).toHaveJSProperty("naturalWidth", 1);
  });

  test(
    "C5: a file that is too large or not an allowed image is refused, and removing it unblocks the form",
    { tag: ["@core"] },
    async ({ persona, pages, wallet, s3 }) => {
      await openWizard({ persona, pages });
      await pages.onboarding.fill({ name: "Picky" });
      await expect(pages.onboarding.nextButton).toBeEnabled();

      // One byte over the limit.
      await pages.onboarding.chooseAvatar({
        name: "huge.png",
        mimeType: "image/png",
        buffer: Buffer.concat([PNG, Buffer.alloc(TWO_MEGABYTES + 1 - PNG.length)]),
      });
      await expect(pages.onboarding.avatarMessage).toHaveText("Avatar size must not exceed 2MB");
      await expect(pages.onboarding.nextButton).toBeDisabled();

      // Exactly at the limit is accepted.
      await pages.onboarding.chooseAvatar({
        name: "limit.png",
        mimeType: "image/png",
        buffer: Buffer.concat([PNG, Buffer.alloc(TWO_MEGABYTES - PNG.length)]),
      });
      await expect(pages.onboarding.avatarMessage).toBeHidden();
      await expect(pages.onboarding.nextButton).toBeEnabled();

      // Not an image at all.
      await pages.onboarding.chooseAvatar({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
      await expect(pages.onboarding.avatarMessage).toHaveText("Avatar must be a valid image");
      await expect(pages.onboarding.nextButton).toBeDisabled();

      // An image of a type the app does not take.
      await pages.onboarding.chooseAvatar({ name: "picture.bmp", mimeType: "image/bmp", buffer: Buffer.from("BM") });
      await expect(pages.onboarding.avatarMessage).toHaveText("Avatar must be a JPEG, PNG, WebP, SVG, or GIF image");
      await expect(pages.onboarding.nextButton).toBeDisabled();

      await pages.onboarding.removePhotoButton.click();
      await expect(pages.onboarding.avatarMessage).toBeHidden();
      await expect(pages.onboarding.avatarPreview).toHaveAttribute("data-has-image", "false");
      await expect(pages.onboarding.nextButton).toBeEnabled();
      // What was typed is still there.
      await expect(pages.onboarding.nameInput).toHaveValue("Picky");

      // Refusing a file happens in the browser: nothing was signed or uploaded.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect((await s3.requests()).filter((request) => request.method === "PUT")).toHaveLength(0);
    },
  );

  test(
    "C6: name and bio count their characters and refuse one too many",
    { tag: ["@core"] },
    async ({ persona, pages, wallet }) => {
      await openWizard({ persona, pages });
      const { nameInput, bioInput, nextButton } = pages.onboarding;

      // Both are optional: an empty form may go on.
      await expect(nameInput).toHaveAccessibleDescription("0/100 characters");
      await expect(bioInput).toHaveAccessibleDescription("0/500 characters");
      await expect(nextButton).toBeEnabled();

      await nameInput.fill("Ada");
      await expect(nameInput).toHaveAccessibleDescription("3/100 characters");

      await nameInput.fill("n".repeat(101));
      await expect(nameInput).toHaveAccessibleDescription("Name must be 100 characters or less");
      await expect(nameInput).toHaveAttribute("aria-invalid", "true");
      await expect(nextButton).toBeDisabled();

      await nameInput.fill("n".repeat(100));
      await expect(nameInput).toHaveAccessibleDescription("100/100 characters");
      await expect(nameInput).toHaveAttribute("aria-invalid", "false");
      await expect(nextButton).toBeEnabled();

      await bioInput.fill("b".repeat(501));
      await expect(bioInput).toHaveAccessibleDescription("Bio must be 500 characters or less");
      await expect(bioInput).toHaveAttribute("aria-invalid", "true");
      await expect(nextButton).toBeDisabled();
      // The name is not blamed for the bio.
      await expect(nameInput).toHaveAccessibleDescription("100/100 characters");

      await bioInput.fill("b".repeat(500));
      await expect(bioInput).toHaveAccessibleDescription("500/500 characters");
      await expect(nextButton).toBeEnabled();

      // The longest allowed values reach the review, and Back keeps them.
      await pages.onboarding.toReview();
      await expect(pages.onboarding.review).toContainText("n".repeat(100));
      await expect(pages.onboarding.review).toContainText("b".repeat(500));
      await pages.onboarding.backButton.click();
      await expect(nameInput).toHaveValue("n".repeat(100));
      await expect(bioInput).toHaveValue("b".repeat(500));

      await expect(pages.shell.toast("error")).toHaveCount(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
    },
  );
});
