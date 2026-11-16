import { expect, test } from "../../fixtures";
import { cidOf } from "../../support/backends/s3";
import { BadgeEditForm } from "../../support/pages/badge-create-edit";
import { expectNeverAskedToFundSocietyAccount, expectOwnerPaidThroughAccount } from "../../support/write-route";
import { PNG, badgeModifiedIn, uploads } from "./steps";

/**
 * Managing a badge: "Manage" on /badges/<id> opens the edit form
 * (?edit=true) for an account that may edit the badge, and for nobody else.
 *
 * modifyBadge is not sponsored: the Light Account (a manager of the badge)
 * makes the call and the owner wallet pays, after one signature for the
 * upload of the new metadata.
 */

const UPDATED = "Badge updated successfully!";
/** The description the badgeMinter persona gives its badge (support/personas.ts). */
const SEEDED_DESCRIPTION = "A badge made for one browser test.";

test.describe("badge editing", () => {
  test(
    "I8: a manager changes a badge's name, image and metadata from Manage, and the badge's page shows them",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, s3, subgraph, seenText }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const newName = `${badge.name} (edited)`;
      const newDescription = `Edited by the browser test ${me.address.slice(2, 8)}.`;
      expect(await chain.read("canEdit", [badge.id, me.address]), "the persona may edit its badge").toBe(true);
      const uriBefore = await chain.read("uri", [badge.id]);

      const edit = new BadgeEditForm(page);
      await edit.open(badge.id);
      await expect(edit.detailTitle(badge.name)).toBeVisible();
      await expect(page.getByText(SEEDED_DESCRIPTION, { exact: true })).toBeVisible();
      // A visitor is not offered to manage anything.
      await expect(edit.manageButton).toHaveCount(0);

      await pages.shell.connect();
      await edit.manageButton.click();
      await expect(page).toHaveURL(new RegExp(`/badges/${badge.id}\\?edit=true$`));

      // The form opens with what the badge has now, and has nothing to save yet.
      await expect(edit.heading).toHaveText(`Edit Badge: ${badge.name}`);
      await expect(edit.nameInput).toHaveValue(badge.name);
      await expect(edit.metadataInput).toHaveValue(new RegExp(SEEDED_DESCRIPTION.replace(".", "\\.")));
      await expect(edit.imagePreview).toHaveAttribute("data-has-image", "false");
      await expect(edit.saveButton).toBeDisabled();
      // The persona holds no official-badge role, so that is not on offer.
      await expect(edit.officialCheckbox).toHaveCount(0);

      await edit.nameInput.fill(newName);
      await edit.metadataInput.fill(JSON.stringify({ description: newDescription }));
      await edit.chooseImage({ name: "badge.png", mimeType: "image/png", buffer: PNG });
      await expect(edit.imagePreview).toHaveAttribute("data-has-image", "true");
      await expect(edit.saveButton).toBeEnabled();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const uploadsBefore = uploads(await s3.requests()).length;
      wallet.clearRequests();
      aa.clear();
      await edit.saveButton.click();
      await expect(pages.shell.toast("success").filter({ hasText: UPDATED })).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One signature (the upload authentication) and one transaction, from
      // the wallet through the Light Account, paid by the wallet.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expect(aa.userOperations(), "no user operation").toHaveLength(0);

      // The badge on chain: new name and new metadata, everything else as it was.
      const modified = badgeModifiedIn(receipt);
      expect(modified.id).toBe(badge.id);
      expect(modified.name).toBe(newName);
      const [nameOnChain, , isOfficial, isCommunityBadge, uriOnChain] = await chain.read("badges", [badge.id]);
      expect(nameOnChain).toBe(newName);
      expect(isOfficial).toBe(false);
      expect(isCommunityBadge).toBe(false);
      expect(uriOnChain).not.toBe(uriBefore);
      expect(uriOnChain).toBe(modified.metadataURI);
      expect(await chain.read("uri", [badge.id])).toBe(uriOnChain);
      expect(await chain.read("getBadgeMinters", [badge.id]), "the minting rule is untouched").toEqual([
        me.profile!.badgeId,
      ]);
      expect(await chain.badgeBalance(me.holder!.address, badge.id), "its holder still holds it").toBe(BigInt(1));

      // The new metadata: what was typed, and the picture pinned by itself.
      const metadata = await s3.getJson<{ description: string; imageUrl: string }>(cidOf(uriOnChain));
      expect(metadata).toMatchObject({ description: newDescription });
      expect(metadata!.imageUrl).toMatch(/^https:\/\/.+\/ipfs\/[a-z0-9]+$/);
      expect((await s3.get(cidOf(metadata!.imageUrl)))?.equals(PNG), "the pinned image is the chosen file").toBe(true);
      expect(uploads(await s3.requests()).length - uploadsBefore, "the image and the metadata were pinned").toBe(2);
      expect((await subgraph.entity("Badge", badge.id.toString()))?.name, "the subgraph fake followed").toBe(newName);

      // The form has closed and the badge's page shows the new name,
      // description and picture.
      await expect(edit.heading).toHaveCount(0);
      await expect(edit.detailTitle(newName)).toBeVisible();
      await expect(page.getByText(newDescription, { exact: true })).toBeVisible();
      await expect(page.getByText(SEEDED_DESCRIPTION, { exact: true })).toHaveCount(0);
      const picture = edit.detailImage(newName);
      await expect(picture).toHaveAttribute("src", metadata!.imageUrl);
      await expect(picture).toHaveJSProperty("naturalWidth", 1);
      await expect(edit.manageButton).toBeVisible();
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: UPDATED });
    },
  );

  test(
    "I8: Cancel closes the edit form without asking the wallet for anything, and the badge is unchanged",
    { tag: ["@edge"] },
    async ({ persona, pages, page, wallet, chain }) => {
      const me = await persona("badgeMinter");
      const badge = me.badge!;
      const uriBefore = await chain.read("uri", [badge.id]);

      const edit = new BadgeEditForm(page);
      await edit.open(badge.id, { edit: true });
      await pages.shell.connect();
      await expect(edit.heading).toHaveText(`Edit Badge: ${badge.name}`);
      await expect(edit.metadataInput).toHaveValue(new RegExp(SEEDED_DESCRIPTION.replace(".", "\\.")));
      wallet.clearRequests();
      await edit.nameInput.fill("Never Saved");
      await expect(edit.saveButton).toBeEnabled();

      await edit.cancelButton.click();
      await expect(edit.heading).toHaveCount(0);
      await expect(edit.detailTitle(badge.name)).toBeVisible();
      await expect(edit.manageButton).toBeVisible();

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      const [nameOnChain] = await chain.read("badges", [badge.id]);
      expect(nameOnChain).toBe(badge.name);
      expect(await chain.read("uri", [badge.id])).toBe(uriBefore);

      // Opening it again starts from the badge, not from what was typed.
      await edit.manageButton.click();
      await expect(edit.nameInput).toHaveValue(badge.name);
      await expect(edit.saveButton).toBeDisabled();
    },
  );

  test(
    "I9: ?edit=true shows the badge, not the edit form, to a visitor and to a member who does not manage it",
    { tag: ["@edge"] },
    async ({ persona, actor, pages, page, wallet, chain }) => {
      const manager = await actor("badgeMinter");
      const badge = manager.badge!;
      const me = await persona("member");
      expect(await chain.read("canEdit", [badge.id, me.address])).toBe(false);
      expect(await chain.read("canEdit", [badge.id, me.ownerAddress])).toBe(false);

      // Logged out.
      const edit = new BadgeEditForm(page);
      await edit.open(badge.id, { edit: true });
      await expect(edit.detailTitle(badge.name)).toBeVisible();
      await expect(edit.heading).toHaveCount(0);
      await expect(edit.saveButton).toHaveCount(0);
      await expect(edit.manageButton).toHaveCount(0);

      // Connected as a member who is not one of its managers. The account
      // menu names the Society address once the app knows who is connected,
      // which is what the manager check waits for.
      await pages.shell.connect();
      const menu = await pages.shell.readAccountMenu();
      expect(menu.society?.toLowerCase()).toBe(me.address.toLowerCase());
      await expect(edit.detailTitle(badge.name)).toBeVisible();
      await expect(pages.badge.holders.section).toBeVisible();
      await expect(edit.heading).toHaveCount(0);
      await expect(edit.nameInput).toHaveCount(0);
      await expect(edit.saveButton).toHaveCount(0);
      await expect(edit.manageButton).toHaveCount(0);

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
