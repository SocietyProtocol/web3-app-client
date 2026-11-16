import { isAddressEqual, parseEventLogs, type TransactionReceipt } from "viem";
import { CommunityRegistryAbi } from "../../../src/abis/CommunityRegistry";
import { COMMUNITY_REGISTRY_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { cidOf } from "../../support/backends/s3";
import { communityAsIndexed, readCommunityOnChain } from "../../support/builders/community-detail-seed";
import { CommunityCreatePage } from "../../support/pages/communities-create";
import { CommunityDetailPage } from "../../support/pages/community-detail";
import {
  amountNamed,
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
} from "../../support/write-route";

/**
 * /create-community: the wizard that creates a community.
 *
 * createCommunity is a call to the CommunityRegistry and is never
 * sponsored: the owner wallet pays, through the member's Light Account,
 * which becomes the community's manager. Before that the wallet signs once,
 * to authenticate the upload of the three badges' metadata.
 *
 * The subgraph fake does not follow the registry. Where a test goes on to
 * the new community's page, it first tells the fake what the real subgraph
 * would have indexed (`communityAsIndexed`), from what is on chain.
 */

/** A valid 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const TWO_MEGABYTES = 2 * 1024 * 1024;
const EXPLORER_TX = "https://sepolia.etherscan.io/tx/";
const LOGO_HINT = "Used as the manager badge image and to represent the community";
const IMAGE_ERROR = "Image must be a valid JPEG, PNG, WebP, SVG, or GIF and not exceed 2MB";
const JSON_HINT = "Optional: Additional metadata in JSON format";

/** The one CommunityCreated event of a receipt. */
function communityCreatedIn(receipt: TransactionReceipt) {
  const created = parseEventLogs({
    abi: CommunityRegistryAbi,
    eventName: "CommunityCreated",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, COMMUNITY_REGISTRY_ADDRESS)),
  });
  expect(created, "CommunityCreated events").toHaveLength(1);
  return created[0].args;
}

test.describe("communities: creating one", () => {
  test(
    "J5: /create-community asks a visitor to connect, shows the wizard to a connected wallet, and asks for the right network",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet }) => {
      const create = new CommunityCreatePage(page);
      await persona("member");

      // Nobody connected: the reason, and a way to connect. No wizard.
      await create.open();
      await expect(pages.shell.connectPrompt).toContainText("Please connect your wallet to create a community.");
      await expect(create.heading).toHaveCount(0);
      await expect(create.nameInput).toHaveCount(0);

      // Connected: the wizard, at its first step, which cannot be left yet.
      await pages.shell.connect();
      await expect(create.heading).toBeVisible();
      await expect(pages.shell.connectPrompt).toHaveCount(0);
      await expect(create.nameInput).toBeVisible();
      await expect(create.nextButton).toBeDisabled();

      // The wallet moves to another network: the wizard gives way to the prompt to switch back.
      await wallet.setChainId(1);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(create.heading).toHaveCount(0);
      await pages.shell.switchNetworkButton.click();
      await expect(create.heading).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toHaveCount(0);
    },
  );

  test(
    "J6: a member creates a community in three steps, the wallet pays through the Society account, and Community Created! links to it",
    { tag: ["@smoke", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const create = new CommunityCreatePage(page);
      const detail = new CommunityDetailPage(page);
      const me = await persona("fundedMember");
      const name = `E2E Founders ${me.address.slice(2, 8)}`;
      const description = "Founded by the browser test suite.";
      const memberMetadata = { attributes: [{ trait_type: "suite", value: "e2e" }] };
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await create.open();
      await pages.shell.connect();

      // Step 1: logo, name, description.
      await create.imageFileInputs.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
      await expect(create.imagePreviews).toHaveAttribute("data-has-image", "true");
      await expect(create.imageMessages).toHaveText(LOGO_HINT);
      await create.toBadgeDetails({ name, description });

      // Step 2: metadata for the member badge only.
      await create.metadataInput("Member").fill(JSON.stringify(memberMetadata));
      await create.toReview();

      // Step 3: what will be created. The three badges are named after the community.
      const badgeCards = page.getByTestId("badge-card");
      await expect(badgeCards).toHaveCount(3);
      for (const kind of ["Manager", "Assistant", "Member"]) {
        await expect(badgeCards.filter({ hasText: `${name} ${kind}` })).toHaveCount(1);
      }
      await expect(page.getByText(description, { exact: true })).toBeVisible();
      await expect(page.getByText(/"trait_type": "suite"/)).toBeVisible();
      await expect(page.getByText("No additional metadata", { exact: true })).toHaveCount(2);
      await expect(create.reviewNote).toBeVisible();

      wallet.clearRequests();
      aa.clear();
      await create.finishButton.click();

      // (Not transactionToast("success"): the upload's own success toast has a key that ends the same way.)
      await expect(pages.shell.toast("success").filter({ hasText: "Community created successfully" })).toBeVisible({
        timeout: 60_000,
      });
      await expect(create.createdHeading).toBeVisible();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One signature (the upload) and one transaction, from the wallet to
      // its Light Account. Nothing went to the sponsorship proxy.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      // On chain: the community, created by the Light Account, which holds
      // its manager badge (the community's id) and one member badge.
      const created = communityCreatedIn(receipt);
      expect(isAddressEqual(created.creator, me.address), "created by the Light Account").toBe(true);
      const id = created.communityId;
      const details = await readCommunityOnChain(chain, id);
      expect(details.name).toBe(name);
      expect(details.description).toBe(description);
      expect(details.assistantBadgeId).toBe(created.assistantBadgeId);
      expect(details.memberBadgeId).toBe(created.memberBadgeId);
      expect(await chain.badgeBalance(me.address, id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.address, created.memberBadgeId)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.address, created.assistantBadgeId)).toBe(BigInt(0));
      expect(await chain.badgeBalance(me.ownerAddress, id), "the wallet itself holds nothing").toBe(BigInt(0));

      // The pinned metadata: three documents and the logo. The member badge
      // carries what was typed; the manager badge points at the logo.
      const memberBadge = await s3.getJson<Record<string, unknown>>(
        cidOf(await chain.read("uri", [created.memberBadgeId])),
      );
      expect(memberBadge).toMatchObject({ ...memberMetadata, imageUrl: null });
      const managerBadge = await s3.getJson<{ imageUrl: string }>(cidOf(await chain.read("uri", [id])));
      expect(managerBadge!.imageUrl).toMatch(/^https:\/\/.+\/ipfs\/[a-z0-9]+$/);
      expect((await s3.get(cidOf(managerBadge!.imageUrl)))?.equals(PNG), "the pinned logo is the chosen file").toBe(true);
      const assistantBadge = await s3.getJson(cidOf(await chain.read("uri", [created.assistantBadgeId])));
      expect(assistantBadge).toMatchObject({ imageUrl: null });

      // The screen that replaced the wizard: the name (read from the chain)
      // and the two ways on.
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(page.getByText("Your community has been successfully created on-chain.")).toBeVisible();
      await expect(create.heading).toHaveCount(0);
      await expect(create.viewTransactionLink).toHaveAttribute("href", `${EXPLORER_TX}${receipt.transactionHash}`);
      await expect(create.viewTransactionLink).toHaveAttribute("target", "_blank");
      await expect(create.viewCommunityLink).toHaveAttribute("href", `/communities/${id}`);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Community created successfully" });

      // View Community. The fake does not index the registry, so it is told
      // what the real subgraph would hold by now.
      await subgraph.sync();
      await subgraph.overlay(
        communityAsIndexed({
          id,
          name: details.name,
          description: details.description,
          manager: me.address,
          assistantBadgeId: details.assistantBadgeId,
          memberBadgeId: details.memberBadgeId,
          createdAt: Number(details.createdAt),
          txHash: receipt.transactionHash,
        }),
      );
      await create.viewCommunityLink.click();
      await expect(page).toHaveURL(new RegExp(`/communities/${id}$`));
      await expect(detail.name(name)).toBeVisible();
      await expect(detail.counts).toHaveText("1 Members · 3 Badges");
      await expect(detail.tierLabel).toHaveText("Unaffiliated Community");
      // Its creator is its manager.
      await expect(detail.tab("settings")).toBeVisible();
    },
  );

  test(
    "J7: the first step needs a name and a description, each within its length",
    { tag: ["@core"] },
    async ({ page, persona, pages }) => {
      const create = new CommunityCreatePage(page);
      await persona("member");
      await create.open();
      await pages.shell.connect();

      // Next stays off until both are filled in.
      await expect(create.nextButton).toBeDisabled();
      await create.nameInput.fill("J7 Validation");
      await expect(create.nextButton).toBeDisabled();
      await create.descriptionInput.fill("A description.");
      await expect(create.nextButton).toBeEnabled();

      // Emptied again: the field says what is missing.
      await create.nameInput.fill("");
      await expect(page.getByText("Community name is required", { exact: true })).toBeVisible();
      await expect(create.nextButton).toBeDisabled();
      await create.nameInput.fill("J7 Validation");
      await expect(page.getByText("Community name is required", { exact: true })).toHaveCount(0);
      await create.descriptionInput.fill("");
      await expect(page.getByText("Description is required", { exact: true })).toBeVisible();
      await expect(create.nextButton).toBeDisabled();

      // Too long: the field says so, and Next refuses to move on.
      await create.descriptionInput.fill("d".repeat(501));
      await expect(page.getByText("Description must be less than 500 characters", { exact: true })).toBeVisible();
      await create.nameInput.fill("n".repeat(101));
      await expect(page.getByText("Community name must be less than 100 characters", { exact: true })).toBeVisible();
      await create.nextButton.click();
      await expect(pages.shell.toast("error")).toHaveText("Please fix the validation errors before proceeding.");
      await expect(create.badgeDetailsIntro).toHaveCount(0);
      await expect(create.nameInput).toBeVisible();

      // At the limits: accepted.
      await create.nameInput.fill("n".repeat(100));
      await create.descriptionInput.fill("d".repeat(500));
      await expect(page.getByText("Community name must be less than 100 characters", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Description must be less than 500 characters", { exact: true })).toHaveCount(0);
      await create.nextButton.click();
      await expect(create.badgeDetailsIntro).toBeVisible();

      // Back keeps what was typed.
      await create.backButton.click();
      await expect(create.nameInput).toHaveValue("n".repeat(100));
    },
  );

  test(
    "J7: badge metadata that is not JSON is flagged, and nothing is uploaded or sent while it stands",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, s3 }) => {
      const create = new CommunityCreatePage(page);
      await persona("fundedMember");
      await create.open();
      await pages.shell.connect();
      await create.toBadgeDetails({ name: "J7 Bad Metadata", description: "Its member badge metadata is not JSON." });

      // All three fields are optional and say so.
      await expect(page.getByText(JSON_HINT, { exact: true })).toHaveCount(3);

      await create.metadataInput("Member").fill("{ not json");
      await expect(page.getByText("Must be valid JSON", { exact: true })).toHaveCount(1);
      await expect(page.getByText(JSON_HINT, { exact: true })).toHaveCount(2);
      await expect(create.metadataInput("Member")).toHaveAttribute("aria-invalid", "true");

      // The wizard lets the member go on to the review, but Finish does not
      // get past the form: no signature, no upload, no transaction.
      await create.toReview();
      const pins = async () => (await s3.requests()).filter((request) => request.method === "PUT").length;
      const pinsBefore = await pins();
      wallet.clearRequests();
      await create.finishButton.click();
      await create.backButton.click();
      await expect(page.getByText("Must be valid JSON", { exact: true })).toBeVisible();
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await pins(), "nothing was pinned").toBe(pinsBefore);
      await expect(create.createdHeading).toHaveCount(0);

      // Valid JSON clears it; so does leaving the field empty.
      await create.metadataInput("Member").fill('{"attributes": []}');
      await expect(page.getByText("Must be valid JSON", { exact: true })).toHaveCount(0);
      await expect(create.metadataInput("Member")).toHaveAttribute("aria-invalid", "false");
      await create.metadataInput("Assistant").fill("[1, 2");
      await expect(page.getByText("Must be valid JSON", { exact: true })).toHaveCount(1);
      await create.metadataInput("Assistant").fill("");
      await expect(page.getByText("Must be valid JSON", { exact: true })).toHaveCount(0);
      await expect(page.getByText(JSON_HINT, { exact: true })).toHaveCount(3);
    },
  );

  test(
    "J7: a logo must be an image of an accepted type of at most 2 MB",
    { tag: ["@core"] },
    async ({ page, persona, pages }) => {
      const create = new CommunityCreatePage(page);
      await persona("member");
      await create.open();
      await pages.shell.connect();

      // Nothing chosen yet.
      await expect(create.imagePreviews).toHaveAttribute("data-has-image", "false");
      await expect(create.imageMessages).toHaveText(LOGO_HINT);
      const removePhoto = page.getByRole("button", { name: "Remove Photo" });
      await expect(removePhoto).toBeDisabled();

      // A type the app does not accept.
      await create.imageFileInputs.setInputFiles({ name: "logo.bmp", mimeType: "image/bmp", buffer: PNG });
      await expect(create.imageMessages).toHaveText(IMAGE_ERROR);

      // One byte over the limit.
      await create.imageFileInputs.setInputFiles({
        name: "huge.png",
        mimeType: "image/png",
        buffer: Buffer.concat([PNG, Buffer.alloc(TWO_MEGABYTES + 1 - PNG.length)]),
      });
      await expect(create.imageMessages).toHaveText(IMAGE_ERROR);

      // Exactly the limit, then an ordinary picture: accepted and previewed.
      await create.imageFileInputs.setInputFiles({
        name: "limit.png",
        mimeType: "image/png",
        buffer: Buffer.concat([PNG, Buffer.alloc(TWO_MEGABYTES - PNG.length)]),
      });
      await expect(create.imageMessages).toHaveText(LOGO_HINT);
      await create.imageFileInputs.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
      await expect(create.imageMessages).toHaveText(LOGO_HINT);
      await expect(create.imagePreviews).toHaveAttribute("data-has-image", "true");
      await expect(create.imagePreviews.getByRole("img")).toHaveAttribute("src", /^data:image\/png;base64,/);

      // Remove Photo takes it away again.
      await removePhoto.click();
      await expect(create.imagePreviews).toHaveAttribute("data-has-image", "false");
      await expect(removePhoto).toBeDisabled();
    },
  );

  test(
    "J8: a new user's community takes two wallet transactions, one to set up the Society account and one to create the community as it",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, seenText }) => {
      const create = new CommunityCreatePage(page);
      const me = await persona("newFunded");
      const name = `E2E New User Community ${me.address.slice(2, 8)}`;
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(await chain.isContract(me.address), "the Light Account is not deployed").toBe(false);

      await create.open();
      await pages.shell.connect();
      await create.fillToReview({ name, description: "Created by a wallet that had no Society account yet." });

      const setUp = wallet.holdNext("transaction");
      const action = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await create.finishButton.click();

      // The upload is signed and done first. Then step 1: the wallet deploys its Light Account.
      await setUp.requested;
      await expect(pages.shell.transactionStepNotice).toHaveText(
        "Step 1 of 2: confirm setting up your Society account in your wallet",
      );
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(1);
      expect(await chain.isContract(me.address)).toBe(false);
      setUp.approve();

      // Step 2: createCommunity, by the account that now exists. (Its
      // notice is never shown here, an app bug: the next test.)
      await action.requested;
      expect(await chain.isContract(me.address), "the Light Account is deployed").toBe(true);
      action.approve();

      // (Not transactionToast("success"): the upload's own success toast has a key that ends the same way.)
      await expect(pages.shell.toast("success").filter({ hasText: "Community created successfully" })).toBeVisible({
        timeout: 60_000,
      });
      await expect(create.createdHeading).toBeVisible();
      await expect(pages.shell.transactionStepNotice).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One signature and two transactions, both paid by the wallet.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1, deploysAccount: true },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);

      // The community's creator and manager is the Light Account.
      const created = communityCreatedIn(receipt);
      expect(isAddressEqual(created.creator, me.address), "created by the Light Account").toBe(true);
      expect((await readCommunityOnChain(chain, created.communityId)).name).toBe(name);
      expect(await chain.badgeBalance(me.address, created.communityId)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.ownerAddress, created.communityId)).toBe(BigInt(0));
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(create.viewCommunityLink).toHaveAttribute("href", `/communities/${created.communityId}`);
      await expectNeverAskedToFundSocietyAccount(seenText, me, {
        saw: "Step 1 of 2: confirm setting up your Society account",
      });
    },
  );

  test(
    "J8: the notice of the second step is shown while its wallet prompt is open",
    { tag: ["@edge", "@owner-tx"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const create = new CommunityCreatePage(page);
      const me = await persona("newFunded");

      await create.open();
      await pages.shell.connect();
      await create.fillToReview({
        name: `E2E Step Two Community ${me.address.slice(2, 8)}`,
        description: "Created to read the notice of the second step.",
      });

      const setUp = wallet.holdNext("transaction");
      const action = wallet.holdNext("transaction");
      await create.finishButton.click();
      await setUp.requested;
      await expect(pages.shell.transactionStepNotice).toHaveText(
        "Step 1 of 2: confirm setting up your Society account in your wallet",
      );
      setUp.approve();

      // The second prompt is open and stays open: the test does not answer it.
      await action.requested;
      expect(await chain.isContract(me.address)).toBe(true);
      expect(wallet.sendTransactionRequests()).toHaveLength(2);
      await expect(pages.shell.transactionStepNotice.filter({ hasText: "Step 1 of 2" })).toHaveCount(0);

      // APP BUG, expected to fail until it is fixed: "Step 2 of 2: confirm
      // the action in your wallet" never shows here. useTransaction's
      // notify() closes the step-1 notice and at once enqueues the step-2
      // notice under the same snackbar key (the I7 bug in
      // features/badge-create). There the step-2 notice is painted for a
      // moment; here, with the upload's toasts on screen as well, it is not
      // painted at all (probably queued behind notistack's maxSnack of 3
      // and removed with the old notice's key).
      test.fail(true, "the step-2 notice of a community creation is never shown (same snackbar key reused)");
      // Short on purpose: a fixed app has this on screen when the assertion
      // starts (its wallet prompt is open). Remove this timeout together
      // with test.fail.
      await expect(pages.shell.transactionStepNotice.filter({ hasText: "Step 2 of 2" })).toHaveText(
        "Step 2 of 2: confirm the action in your wallet",
        { timeout: 2_000 },
      );
    },
  );

  test(
    "J8: a new user without ETH is told what the wallet needs after the upload, and nothing is sent",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, s3, seenText }) => {
      const create = new CommunityCreatePage(page);
      const me = await persona("new");
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));

      await create.open();
      await pages.shell.connect();
      await create.fillToReview({
        name: `E2E Unfunded Community ${me.address.slice(2, 8)}`,
        description: "Its creator's wallet holds no ETH.",
      });
      wallet.clearRequests();
      aa.clear();
      await create.finishButton.click();

      // The message names the wallet and an amount of ETH for the wallet.
      const error = pages.shell.toast("error");
      await expect(error).toHaveText(
        new RegExp(`^Your wallet ${me.ownerAddress} needs about [\\d.]+ ETH to pay the network fee for this action$`),
      );
      expect(amountNamed(await error.innerText())).toBeGreaterThan(BigInt(0));
      await expect(error).not.toContainText(me.address);

      // The upload had been signed and made by then: three documents.
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["ok"]);
      expect((await s3.requests()).filter((request) => request.method === "PUT")).toHaveLength(3);

      // Nothing else: no transaction, no user operation, no account.
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.calls).toHaveLength(0);
      expect(await chain.isContract(me.address)).toBe(false);
      expect(await chain.balance(me.address)).toBe(BigInt(0));

      // Still on the review step, which can be used again.
      await expect(page).toHaveURL(/\/create-community$/);
      await expect(create.createdHeading).toHaveCount(0);
      await expect(create.finishButton).toBeEnabled();
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "to pay the network fee for this action" });
    },
  );
});
