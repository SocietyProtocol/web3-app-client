import { expect, test } from "../../fixtures";
import { BadgeCreateForm } from "../../support/pages/badge-create-form";
import { expectNeverAskedToFundSocietyAccount, expectOwnerPaidThroughAccount } from "../../support/write-route";
import { IMAGE_REFUSED, PNG, TWO_MEGABYTES, badgeCreatedIn, uploads } from "./steps";

/**
 * The badge wizard's form: what it refuses before anything is sent, what
 * the preview next to it shows, and what happens when pinning the metadata
 * fails. Only the last one gets as far as the wallet.
 */

const NAME_REQUIRED = "Badge name is required";
const NAME_TOO_LONG = "Badge name must be less than 100 characters";
const METADATA_INVALID = "Metadata must be valid JSON";
const METADATA_HINT = "Optional: Additional metadata in JSON format";
const UPLOADING = "Uploading metadata to IPFS...";

test.describe("badge creation: the form", () => {
  test(
    "I3: the wizard does not go on without a name, with a name that is too long or with metadata that is not JSON",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet }) => {
      await persona("member");
      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      wallet.clearRequests();

      // Nothing typed yet: no way on, and no complaint either.
      await expect(form.nameInput).toHaveValue("");
      await expect(form.nextButton).toBeDisabled();
      await expect(page.getByText(NAME_REQUIRED)).toBeHidden();
      await expect(page.getByText(METADATA_HINT)).toBeVisible();

      // A name opens the way; taking it out again says why it is closed.
      await form.nameInput.fill("Valid Name");
      await expect(form.nextButton).toBeEnabled();
      await form.nameInput.fill("");
      await expect(page.getByText(NAME_REQUIRED)).toBeVisible();
      await expect(form.nextButton).toBeDisabled();

      // 100 characters are allowed, 101 are not.
      await form.nameInput.fill("n".repeat(101));
      await expect(page.getByText(NAME_TOO_LONG)).toBeVisible();
      await expect(form.nextButton).toBeDisabled();
      await form.nameInput.fill("n".repeat(100));
      await expect(page.getByText(NAME_TOO_LONG)).toBeHidden();
      await expect(form.nextButton).toBeEnabled();

      // Metadata is optional, but what is there has to be JSON.
      await form.metadataInput.fill('{"description": "unfinished');
      await expect(page.getByText(METADATA_INVALID)).toBeVisible();
      await expect(page.getByText(METADATA_HINT)).toBeHidden();
      await expect(form.nextButton).toBeDisabled();
      await form.metadataInput.fill('{"description": "finished"}');
      await expect(page.getByText(METADATA_INVALID)).toBeHidden();
      await expect(page.getByText(METADATA_HINT)).toBeVisible();
      await expect(form.nextButton).toBeEnabled();
      await form.metadataInput.fill("");
      await expect(form.nextButton).toBeEnabled();

      // A valid form reaches the Permissions step, and Back keeps what was typed.
      await form.nextButton.click();
      await expect(form.finishButton).toBeEnabled();
      await form.backButton.click();
      await expect(form.nameInput).toHaveValue("n".repeat(100));

      // The form never asked the wallet for anything.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "I3: an image that is too large or not an allowed picture is refused, and removing it unblocks the wizard",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet, s3 }) => {
      await persona("member");
      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      wallet.clearRequests();
      await form.nameInput.fill("Picky Badge");
      await expect(form.nextButton).toBeEnabled();
      await expect(form.imagePreview).toHaveAttribute("data-has-image", "false");
      await expect(form.removePhotoButton).toBeDisabled();

      // A picture the wizard takes.
      await form.chooseImage({ name: "badge.png", mimeType: "image/png", buffer: PNG });
      await expect(form.imagePreview).toHaveAttribute("data-has-image", "true");
      await expect(form.image).toHaveAttribute("src", /^data:image\/png;base64,/);
      await expect(form.image).toHaveJSProperty("naturalWidth", 1);
      await expect(form.imageMessage).toBeHidden();
      await expect(form.nextButton).toBeEnabled();

      // One byte over the limit.
      await form.chooseImage({
        name: "huge.png",
        mimeType: "image/png",
        buffer: Buffer.concat([PNG, Buffer.alloc(TWO_MEGABYTES + 1 - PNG.length)]),
      });
      await expect(form.imageMessage).toHaveText(IMAGE_REFUSED);
      await expect(form.nextButton).toBeDisabled();

      // Exactly at the limit is accepted.
      await form.chooseImage({
        name: "limit.png",
        mimeType: "image/png",
        buffer: Buffer.concat([PNG, Buffer.alloc(TWO_MEGABYTES - PNG.length)]),
      });
      await expect(form.imageMessage).toBeHidden();
      await expect(form.nextButton).toBeEnabled();

      // Not an image at all.
      await form.chooseImage({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
      await expect(form.imageMessage).toHaveText(IMAGE_REFUSED);
      await expect(form.nextButton).toBeDisabled();

      // A good picture again, so that the next refusal is a new one: the
      // message of the last refusal would otherwise still be on screen.
      await form.chooseImage({ name: "badge.png", mimeType: "image/png", buffer: PNG });
      await expect(form.imageMessage).toBeHidden();
      await expect(form.imagePreview).toHaveAttribute("data-has-image", "true");
      await expect(form.nextButton).toBeEnabled();

      // An image of a type the app does not take.
      await form.chooseImage({ name: "picture.bmp", mimeType: "image/bmp", buffer: Buffer.from("BM") });
      await expect(form.imageMessage).toHaveText(IMAGE_REFUSED);
      await expect(form.nextButton).toBeDisabled();

      await form.removePhotoButton.click();
      await expect(form.imageMessage).toBeHidden();
      await expect(form.imagePreview).toHaveAttribute("data-has-image", "false");
      await expect(form.nextButton).toBeEnabled();
      // What was typed is still there.
      await expect(form.nameInput).toHaveValue("Picky Badge");

      // Choosing pictures uploaded nothing and asked the wallet for nothing.
      expect(uploads(await s3.requests())).toHaveLength(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "I6: the preview card shows the name as it is typed and the kind of badge, on both steps",
    { tag: ["@edge"] },
    async ({ persona, pages, page }) => {
      await persona("member");
      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();

      // An empty form: a placeholder name, the preview's id, an individual badge.
      await expect(form.preview).toBeVisible();
      await expect(form.preview).toContainText("Untitled Badge");
      await expect(form.preview).toContainText("ID: #(Preview)");
      await expect(form.preview).toContainText("INDIVIDUAL");
      // A preview is not a link to a badge.
      await expect(form.preview.getByRole("link")).toHaveCount(0);

      await form.nameInput.fill("Early");
      await expect(form.preview).toContainText("Early");
      await expect(form.preview).not.toContainText("Untitled Badge");
      await form.nameInput.fill("Early Member");
      await expect(form.preview).toContainText("Early Member");

      // It stays next to the Permissions step.
      await form.nextButton.click();
      await form.finishButton.waitFor();
      await expect(form.preview).toContainText("Early Member");
      await expect(form.preview).toContainText("INDIVIDUAL");

      // Without a name it is the placeholder again.
      await form.backButton.click();
      await form.nameInput.fill("");
      await expect(form.preview).toContainText("Untitled Badge");
    },
  );

  test("I6: the preview card shows the chosen image", { tag: ["@edge"] }, async ({ persona, pages, page }) => {
    await persona("member");
    const form = new BadgeCreateForm(page);
    await form.open();
    await pages.shell.connect();
    await form.nameInput.fill("Pictured");
    await form.chooseImage({ name: "badge.png", mimeType: "image/png", buffer: PNG });
    // The form itself shows the picture.
    await expect(form.image).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(form.image).toHaveJSProperty("naturalWidth", 1);
    await expect(form.preview).toContainText("Pictured");
    const previewImage = form.preview.getByRole("img", { name: "Pictured", exact: true });
    await expect(previewImage).toBeVisible();

    // The preview card shows the chosen picture, not the default one.
    await expect(previewImage).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(previewImage).toHaveJSProperty("naturalWidth", 1);
  });

  test(
    "I10: an expired upload signature is refused with its reason, and no transaction is asked for",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet, aa, chain, s3 }) => {
      // The device clock is six minutes slow: the app stamps the upload
      // authentication with it, and the server takes signatures up to five
      // minutes old. This is the real /api/upload-metadata answering 401.
      await page.clock.install({ time: new Date(Date.now() - 6 * 60_000) });
      await persona("fundedMember");
      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      await form.nameInput.fill("Never Created");
      await form.metadataInput.fill('{"description": "Its metadata cannot be pinned."}');
      await form.nextButton.click();
      await form.finishButton.waitFor();

      const nextBadgeId = await chain.read("nextTokenId");
      const uploadsBefore = uploads(await s3.requests()).length;
      wallet.clearRequests();
      aa.clear();
      await form.finishButton.click();
      await expect(pages.shell.toast("error")).toHaveText("Message expired");

      // The wallet signed the upload authentication and was asked for nothing else.
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(uploads(await s3.requests()).length, "nothing was pinned").toBe(uploadsBefore);
      expect(await chain.read("nextTokenId"), "no badge was created").toBe(nextBadgeId);

      // The "uploading" notice is gone, there is no success message, and the
      // wizard is where it was, ready to be used again.
      await expect(page.getByText(UPLOADING)).toBeHidden();
      await expect(pages.shell.toast("success")).toHaveCount(0);
      await expect(page).toHaveURL(/\/create-badge$/);
      await expect(form.finishButton).toBeEnabled();
    },
  );

  test(
    "I10: when pinning the metadata fails the error is shown, no transaction is asked for, and Finish works once storage is back",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, s3, seenText }) => {
      const me = await persona("fundedMember");
      const name = `E2E Second Try ${me.address.slice(2, 8)}`;
      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      await form.nameInput.fill(name);
      await form.metadataInput.fill('{"description": "Pinned at the second attempt."}');
      await form.nextButton.click();
      await form.finishButton.waitFor();

      // The storage behind /api/upload-metadata is down (the AWS SDK retries
      // a few times; fail them all), so the route answers 500.
      const nextBadgeId = await chain.read("nextTokenId");
      await s3.failNext(10, 500);
      wallet.clearRequests();
      aa.clear();
      await form.finishButton.click();
      await expect(pages.shell.toast("error")).toHaveText("Server error occurred. Please try again later.");

      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("nextTokenId"), "no badge was created").toBe(nextBadgeId);
      await expect(page.getByText(UPLOADING)).toBeHidden();
      await expect(pages.shell.toast("success")).toHaveCount(0);
      await expect(page).toHaveURL(/\/create-badge$/);
      await expect(form.finishButton).toBeEnabled();

      // Storage is back: the same click now pins the metadata and creates the badge.
      await s3.failNext(0);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await form.finishButton.click();
      await expect(pages.shell.toast("success").filter({ hasText: "Badge created successfully" })).toBeVisible({
        timeout: 60_000,
      });
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      const created = badgeCreatedIn(receipt);
      expect(created.name).toBe(name);
      expect(await chain.read("nextTokenId"), "one badge was created").toBeGreaterThan(nextBadgeId);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge created successfully" });
    },
  );
});
