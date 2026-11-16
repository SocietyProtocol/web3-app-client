import { isAddressEqual, parseEventLogs, zeroAddress, type Address, type TransactionReceipt } from "viem";
import { CommunityRegistryAbi } from "../../../src/abis/CommunityRegistry";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS, COMMUNITY_REGISTRY_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { cidOf } from "../../support/backends/s3";
import { communityMember, removeCommunityMember } from "../../support/builders/communities-entities";
import {
  addAssistant,
  addMember,
  indexedDetails,
  indexedManagerChange,
  readCommunityOnChain,
  seedCommunity,
} from "../../support/builders/community-detail-seed";
import { community as communityFields } from "../../support/builders/entities";
import type { Chain } from "../../support/chain/chain";
import { CommunityDetailPage } from "../../support/pages/community-detail";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectOwnerSentDirectly,
} from "../../support/write-route";
import { indexAfter } from "./steps";

/**
 * /communities/<id> as its manager: revoking a membership, the
 * badge-actions panel, the settings.
 *
 * The community is real on the local chain (seedCommunity): the manager
 * holds its manager badge, and the contracts decide what the manager may
 * do. None of these writes is sponsored. The Light Account acts and the
 * owner wallet pays ("owner pays through the account"), except for a
 * manager badge that still sits on the wallet itself (K8), where the
 * wallet calls the contract directly.
 *
 * The subgraph fake follows the badges contract only. Where the page's
 * answer to a write depends on what the subgraph indexes from the
 * CommunityRegistry or on its membership bookkeeping, the test supplies
 * that part with `indexAfter` (see steps.ts) and says so.
 */

/** A valid 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** The badge transfers (mints, burns, moves) of one unit in a receipt. */
function badgeTransfersIn(receipt: TransactionReceipt) {
  return parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    eventName: "TransferSingle",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
  }).map((log) => log.args);
}

async function blockTime(chain: Chain, receipt: TransactionReceipt): Promise<number> {
  return Number((await chain.public.getBlock({ blockNumber: receipt.blockNumber })).timestamp);
}

/** Whether `account` may mint `badgeId` to `to` right now, by the contract's own answer. */
async function mayMint(chain: Chain, account: Address, badgeId: bigint, to: Address): Promise<boolean> {
  return chain.public
    .simulateContract({
      address: BADGES_ADDRESS,
      abi: SocietyProtocolBadgesABI,
      functionName: "mint",
      args: [to, badgeId, BigInt(1), "0x"],
      account,
    })
    .then(
      () => true,
      () => false,
    );
}

test.describe("community detail: managing a community", () => {
  test(
    "K6: the manager revokes a member from the member's row: the member badge is burned and the row disappears",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, actor, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const deps = { chain, s3, subgraph };
      const [me, member] = await Promise.all([
        persona("fundedMember", { name: "K6 Manager" }),
        actor("member", { name: "K6 Revoked Member" }),
      ]);
      const community = await seedCommunity(deps, { manager: me.address });
      await addMember(deps, community, member.address);
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(await chain.badgeBalance(member.address, community.memberBadgeId)).toBe(BigInt(1));

      // A visitor sees the two members and nothing to do with them.
      await detail.open(community.id, "members");
      await expect(detail.memberRows).toHaveCount(2);
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined"]);
      await expect(detail.revokeButton(detail.memberRows.first())).toHaveCount(0);

      // The manager gets an Actions column with Revoke in every row.
      await pages.shell.connect();
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined", "Actions"]);
      const row = detail.memberRow(member.address);
      await expect(row).toContainText("K6 Revoked Member");
      await expect(detail.revokeButton(row)).toHaveText("Revoke");
      await expect(detail.revokeButton(detail.memberRow(me.address))).toHaveText("Revoke");
      await expect(detail.memberRow(me.address)).toContainText("(You)");

      // Revoke. The fake keeps no memberships of its own, so it is told
      // what the subgraph records when a member badge is burned: the
      // membership is gone and the community has one member less.
      wallet.clearRequests();
      aa.clear();
      const receipt = await indexAfter(
        { subgraph, wallet, chain },
        async () => {
          await detail.revokeButton(row).click();
          await expect(detail.revokeButton(row)).toHaveText("Revoking...");
          await expect(detail.revokeButton(row)).toBeDisabled();
        },
        () => [
          ...removeCommunityMember(community.id, member.address),
          communityFields(community.id, { memberCount: "1" }),
        ],
      );

      await expect(
        pages.shell.transactionToast("success").filter({ hasText: "Badge revoked from K6 Revoked Member" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(detail.memberRow(member.address)).toHaveCount(0);
      await expect(detail.memberRows).toHaveCount(1);
      await expect(detail.memberRow(me.address)).toBeVisible();
      await expect(detail.counts).toHaveText("1 Members · 3 Badges");
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction and no signature, from the wallet to its Light
      // Account, which burned the member's badge.
      const paid = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(paid.transactionHash).toBe(receipt.transactionHash);
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const [burn, ...others] = badgeTransfersIn(receipt);
      expect(others).toHaveLength(0);
      expect(isAddressEqual(burn.operator, me.address), "burned by the Light Account").toBe(true);
      expect(isAddressEqual(burn.from, member.address)).toBe(true);
      expect(burn.to).toBe(zeroAddress);
      expect(burn.id).toBe(community.memberBadgeId);
      expect(await chain.badgeBalance(member.address, community.memberBadgeId)).toBe(BigInt(0));
      expect(await chain.badgeBalance(me.address, community.memberBadgeId), "the manager's own membership").toBe(
        BigInt(1),
      );
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge revoked from K6 Revoked Member" });
    },
  );

  test(
    "K7: the manager's badge-actions panel mints the member badge, and the new member joins the list",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, actor, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const deps = { chain, s3, subgraph };
      const [me, recipient] = await Promise.all([
        persona("fundedMember", { name: "K7 Manager" }),
        actor("member", { name: "K7 New Member" }),
      ]);
      const community = await seedCommunity(deps, { manager: me.address });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      // The panel is the manager's: a visitor does not get it.
      await detail.open(community.id, "members");
      await expect(detail.memberRows).toHaveCount(1);
      await expect(detail.badgeActions).toHaveCount(0);
      await pages.shell.connect();
      await expect(detail.badgeActions).toBeVisible();

      // The member badge is the one acted on unless another is picked. It
      // can be minted and burned by the manager; nobody can transfer it.
      await expect(detail.badgeActionTabs.getByRole("tab")).toHaveText(["Mint", "Burn"]);
      await expect(detail.badgeActionTab("Mint")).toHaveAttribute("aria-selected", "true");
      await pages.badge.setMintRecipient(recipient.address);
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeEnabled();
      await expect(pages.badge.simulationError).toHaveCount(0);

      // Mint. The fake is told what the subgraph records when a member
      // badge is minted: a membership, and one member more.
      wallet.clearRequests();
      aa.clear();
      const receipt = await indexAfter(
        { subgraph, wallet, chain },
        async () => {
          await pages.badge.mintSubmit.click();
        },
        async (mined) => [
          ...communityMember({
            communityId: community.id,
            address: recipient.address,
            badgeId: community.memberBadgeId,
            joinedAt: (await blockTime(chain, mined)) + 1,
            txHash: mined.transactionHash,
          }),
          communityFields(community.id, { memberCount: "2" }),
        ],
      );

      await expect(
        pages.shell.transactionToast("success").filter({ hasText: "Badge minted successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(detail.memberRow(recipient.address)).toContainText("K7 New Member");
      await expect(detail.memberRows).toHaveCount(2);
      // Newest first: the new member is on top.
      expect(await detail.memberAddresses()).toEqual([recipient.address.toLowerCase(), me.address.toLowerCase()]);
      await expect(detail.counts).toHaveText("2 Members · 3 Badges");
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction, no signature: the wallet paid, the Light Account
      // minted the community's member badge.
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const [mint, ...others] = badgeTransfersIn(receipt);
      expect(others).toHaveLength(0);
      expect(isAddressEqual(mint.operator, me.address), "minted by the Light Account").toBe(true);
      expect(mint.from).toBe(zeroAddress);
      expect(isAddressEqual(mint.to, recipient.address)).toBe(true);
      expect(mint.id, "the member badge, not another of the community's").toBe(community.memberBadgeId);
      expect(await chain.badgeBalance(recipient.address, community.memberBadgeId)).toBe(BigInt(1));
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge minted successfully" });
    },
  );

  test(
    "K7: the panel's badge picker switches to the assistant badge, which the manager then mints and burns",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, actor, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const deps = { chain, s3, subgraph };
      const [me, helper] = await Promise.all([
        persona("fundedMember", { name: "K7 Picker Manager" }),
        actor("member", { name: "K7 Helper" }),
      ]);
      const community = await seedCommunity(deps, { manager: me.address });
      const assistantBadgeName = `${community.name} Assistant`;

      await detail.open(community.id, "members");
      await pages.shell.connect();
      await expect(detail.badgeActions).toBeVisible();

      // The picker offers the community's badges other than the manager
      // badge. Searching it by name finds the assistant badge.
      await detail.badgePickerInput.fill(community.name);
      await expect(detail.pickerOption(assistantBadgeName)).toBeVisible();
      await expect(detail.pickerOption(`${community.name} Member`)).toBeVisible();
      await expect(detail.pickerOption(`${community.name} Manager`)).toHaveCount(0);
      await detail.pickBadge(assistantBadgeName);
      await expect(detail.badgeActions).toContainText(`#${community.assistantBadgeId}`);
      await expect(detail.badgeActionTabs.getByRole("tab")).toHaveText(["Mint", "Burn"]);

      // Mint it to a member.
      let ownerBalanceBefore = await chain.balance(me.ownerAddress);
      await pages.badge.setMintRecipient(helper.address);
      await expect(pages.badge.mintSubmit).toHaveText("Mint Badge");
      await expect(pages.badge.mintSubmit).toBeEnabled();
      wallet.clearRequests();
      aa.clear();
      await pages.badge.mintSubmit.click();
      const minted = pages.shell.transactionToast("success").filter({ hasText: "Badge minted successfully" });
      await expect(minted).toBeVisible({ timeout: 60_000 });

      const mintReceipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const [mint, ...otherMints] = badgeTransfersIn(mintReceipt);
      expect(otherMints).toHaveLength(0);
      expect(mint.id, "the assistant badge was minted").toBe(community.assistantBadgeId);
      expect(isAddressEqual(mint.to, helper.address)).toBe(true);
      expect(isAddressEqual(mint.operator, me.address), "minted by the Light Account").toBe(true);
      expect(await chain.badgeBalance(helper.address, community.assistantBadgeId)).toBe(BigInt(1));
      expect(await chain.badgeBalance(helper.address, community.memberBadgeId), "no member badge came with it").toBe(
        BigInt(0),
      );
      // An assistant is not a member: the list is unchanged.
      await expect(detail.memberRows).toHaveCount(1);

      // Burn it again, on the Burn tab: the holder is picked from the badge's holders.
      await detail.badgeActionTab("Burn").click();
      await expect(detail.badgeActions).toContainText("Burning a badge is irreversible.");
      await expect(detail.burnSubmit).toBeDisabled();
      await detail.burnHolderInput.fill("K7 Helper");
      await detail.pickerOption("K7 Helper").click();
      await expect(detail.burnSubmit).toBeDisabled();
      await detail.burnConfirmCheckbox.check();
      await expect(detail.burnSubmit).toHaveText("Burn Badge");
      await expect(detail.burnSubmit).toBeEnabled();

      ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await detail.burnSubmit.click();
      await expect(
        pages.shell.transactionToast("success").filter({ hasText: "Badge burned successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      const burnReceipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const [burn, ...otherBurns] = badgeTransfersIn(burnReceipt);
      expect(otherBurns).toHaveLength(0);
      expect(burn.id).toBe(community.assistantBadgeId);
      expect(isAddressEqual(burn.from, helper.address)).toBe(true);
      expect(burn.to).toBe(zeroAddress);
      expect(isAddressEqual(burn.operator, me.address), "burned by the Light Account").toBe(true);
      expect(await chain.badgeBalance(helper.address, community.assistantBadgeId)).toBe(BigInt(0));
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge burned successfully" });
    },
  );

  test(
    "K8: a manager whose manager badge is still on the wallet gets the manager controls, and the wallet itself sends the write",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("fundedMember", { name: "K8 Wallet Manager" });
      // Created by the wallet, as before the move to Society addresses:
      // the manager badge is the wallet's, not the Light Account's.
      const community = await seedCommunity(
        { chain, s3, subgraph },
        { manager: me.ownerAddress, name: `E2E Wallet Managed ${me.address.slice(2, 8)}` },
      );
      expect(await chain.badgeBalance(me.ownerAddress, community.id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.address, community.id)).toBe(BigInt(0));
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const newName = `${community.name} Renamed`;

      // The manager controls are there although the Society address manages nothing.
      await detail.open(community.id, "members");
      await pages.shell.connect();
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined", "Actions"]);
      await expect(detail.badgeActions).toBeVisible();
      await expect(detail.tab("settings")).toBeVisible();
      await detail.openTab("settings");
      await expect(detail.generalInformation).toBeVisible();

      // Edit Info. Only the wallet may make this call, so it makes it itself.
      await detail.editInfoButton.click();
      const dialog = detail.dialog("Edit Community Info");
      await dialog.getByLabel("Community Name").fill(newName);
      wallet.clearRequests();
      aa.clear();
      // The fake does not index the registry: it is told the new details, read from the chain.
      await indexAfter(
        { subgraph, wallet, chain },
        async () => {
          await detail.saveButton(dialog).click();
        },
        () => indexedDetails(chain, community.id),
      );
      await expect(
        pages.shell.transactionToast("success").filter({ hasText: "Community info updated successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(detail.name(newName)).toBeVisible();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction and no signature, from the wallet straight to the registry.
      const receipt = await expectOwnerSentDirectly(
        { wallet, chain },
        { persona: me, to: COMMUNITY_REGISTRY_ADDRESS, ownerBalanceBefore },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const [updated] = parseEventLogs({ abi: CommunityRegistryAbi, eventName: "CommunityDetailsUpdated", logs: receipt.logs });
      expect(updated.args.communityId).toBe(community.id);
      expect(updated.args.name).toBe(newName);
      expect((await readCommunityOnChain(chain, community.id)).name).toBe(newName);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Community info updated successfully" });
    },
  );

  test(
    "K10: the manager edits the community's name and description in Settings, and the header follows",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("fundedMember", { name: "K10 Manager" });
      const community = await seedCommunity({ chain, s3, subgraph }, { manager: me.address });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const newName = `${community.name} II`;
      const newDescription = "Renamed by its manager in a browser test.";

      await detail.open(community.id, "settings");
      await pages.shell.connect();
      await expect(detail.generalInformation).toBeVisible();
      await expect(page.getByText(community.description, { exact: true })).toBeVisible();

      // The dialog starts from what the community has, and has nothing to save yet.
      await detail.editInfoButton.click();
      const dialog = detail.dialog("Edit Community Info");
      const nameInput = dialog.getByLabel("Community Name");
      const descriptionInput = dialog.getByLabel("Description");
      const save = detail.saveButton(dialog);
      await expect(nameInput).toHaveValue(community.name);
      await expect(descriptionInput).toHaveValue(community.description);
      await expect(save).toBeDisabled();

      // Both are required.
      await nameInput.fill("");
      await expect(dialog.getByText("Name is required", { exact: true })).toBeVisible();
      await expect(save).toBeDisabled();
      await nameInput.fill(newName);
      await descriptionInput.fill("");
      await expect(dialog.getByText("Description is required", { exact: true })).toBeVisible();
      await expect(save).toBeDisabled();
      await descriptionInput.fill(newDescription);
      await expect(save).toBeEnabled();

      wallet.clearRequests();
      aa.clear();
      // The fake does not index the registry: it is told the new details, read from the chain.
      const receipt = await indexAfter(
        { subgraph, wallet, chain },
        async () => {
          await save.click();
          await expect(save).toHaveText("Saving...");
        },
        () => indexedDetails(chain, community.id),
      );

      await expect(
        pages.shell.transactionToast("success").filter({ hasText: "Community info updated successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(dialog).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The header and the settings show the new details.
      await expect(detail.name(newName)).toBeVisible();
      await expect(detail.name(community.name)).toHaveCount(0);
      await expect(page.getByText(newDescription, { exact: true })).toBeVisible();
      await detail.openTab("overview");
      await expect(page.getByText(newDescription, { exact: true })).toBeVisible();

      // One transaction, no signature: the wallet paid, the Light Account
      // (the holder of the manager badge) updated the registry.
      const paid = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(paid.transactionHash).toBe(receipt.transactionHash);
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const updates = parseEventLogs({
        abi: CommunityRegistryAbi,
        eventName: "CommunityDetailsUpdated",
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, COMMUNITY_REGISTRY_ADDRESS)),
      });
      expect(updates).toHaveLength(1);
      expect(updates[0].args).toMatchObject({ communityId: community.id, name: newName, description: newDescription });
      const onChain = await readCommunityOnChain(chain, community.id);
      expect(onChain.name).toBe(newName);
      expect(onChain.description).toBe(newDescription);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Community info updated successfully" });
    },
  );

  test(
    "K11: the manager edits the member badge's image, name and metadata in Settings",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("fundedMember", { name: "K11 Manager" });
      const community = await seedCommunity({ chain, s3, subgraph }, { manager: me.address });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const oldName = `${community.name} Member`;
      const newName = `${community.name} Citizen`;
      const newMetadata = { description: "Renamed by its manager." };

      await detail.open(community.id, "settings");
      await pages.shell.connect();
      await expect(detail.badgeModifications).toBeVisible();
      const cards = page.getByTestId("badge-card");
      await expect(cards.filter({ hasText: oldName })).toHaveCount(1);
      // The card's metadata is the badge's pinned document, without its imageUrl.
      await expect(page.getByText(`"description": "Member of ${community.name}"`)).toBeVisible();

      // The dialog starts from the badge as it is.
      await detail.editBadgeButton("member").click();
      const dialog = detail.dialog("Edit Member Badge");
      const nameInput = dialog.getByLabel("Badge Name");
      const metadataInput = dialog.getByLabel("Metadata (JSON)");
      const save = detail.saveButton(dialog);
      await expect(nameInput).toHaveValue(oldName);
      await expect(metadataInput).toHaveValue(JSON.stringify(community.memberBadgeMetadata, null, 2));
      await expect(dialog.getByTestId("avatar-input-preview")).toHaveAttribute("data-has-image", "false");
      await expect(save).toBeDisabled();

      // Metadata must be JSON.
      await metadataInput.fill("{ not json");
      await expect(dialog.getByText("Metadata must be valid JSON", { exact: true })).toBeVisible();
      await expect(save).toBeDisabled();
      await metadataInput.fill(JSON.stringify(newMetadata));
      await expect(dialog.getByText("Metadata must be valid JSON", { exact: true })).toHaveCount(0);

      await nameInput.fill(newName);
      await dialog.getByTestId("avatar-input-file").setInputFiles({ name: "badge.png", mimeType: "image/png", buffer: PNG });
      await expect(dialog.getByTestId("avatar-input-preview")).toHaveAttribute("data-has-image", "true");
      await expect(save).toBeEnabled();

      wallet.clearRequests();
      aa.clear();
      await save.click();
      await expect(
        pages.shell.toast("success").filter({ hasText: "Member Badge updated successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(dialog).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One signature (the upload) and one transaction, from the wallet to
      // its Light Account, which changed the badge through the registry.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const modified = parseEventLogs({
        abi: SocietyProtocolBadgesABI,
        eventName: "BadgeModified",
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
      });
      expect(modified).toHaveLength(1);
      expect(modified[0].args.id).toBe(community.memberBadgeId);
      expect(modified[0].args.name).toBe(newName);
      expect(modified[0].args.isCommunityBadge, "still a community badge").toBe(true);

      // The badge's URI is the new document: the typed metadata and the pinned picture.
      const uri = await chain.read("uri", [community.memberBadgeId]);
      expect(uri).toBe(modified[0].args.metadataURI);
      expect(uri).not.toBe(community.uris.member);
      const pinned = await s3.getJson<{ description: string; imageUrl: string }>(cidOf(uri));
      expect(pinned).toMatchObject(newMetadata);
      expect(pinned!.imageUrl).toMatch(/^https:\/\/.+\/ipfs\/[a-z0-9]+$/);
      expect((await s3.get(cidOf(pinned!.imageUrl)))?.equals(PNG), "the pinned image is the chosen file").toBe(true);
      // The community itself is untouched.
      expect((await readCommunityOnChain(chain, community.id)).name).toBe(community.name);

      // The settings show the badge as it is now. (The fake follows the
      // badges contract, so this needs no help.)
      await expect(cards.filter({ hasText: newName })).toHaveCount(1);
      await expect(cards.filter({ hasText: oldName })).toHaveCount(0);
      await expect(page.getByText('"description": "Renamed by its manager."')).toBeVisible();
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Member Badge updated successfully" });
    },
  );

  test(
    "K11: renaming the manager badge alone needs no upload, so the wallet is asked for one transaction and no signature",
    { tag: ["@core", "@owner-tx"] },
    async ({ page, persona, pages, wallet, chain, s3, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("fundedMember", { name: "K11 Renamer" });
      const community = await seedCommunity({ chain, s3, subgraph }, { manager: me.address });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const newName = `${community.name} Steward`;
      const pins = async () => (await s3.requests()).filter((request) => request.method === "PUT").length;
      const pinsBefore = await pins();

      await detail.open(community.id, "settings");
      await pages.shell.connect();
      await detail.editBadgeButton("manager").click();
      const dialog = detail.dialog("Edit Manager Badge");
      const nameInput = dialog.getByLabel("Badge Name");
      await expect(nameInput).toHaveValue(`${community.name} Manager`);
      // The manager badge was created without metadata of its own.
      await expect(dialog.getByLabel("Metadata (JSON)")).toHaveValue("");

      // A name is required.
      await nameInput.fill("");
      await expect(dialog.getByText("Badge name is required", { exact: true })).toBeVisible();
      await expect(detail.saveButton(dialog)).toBeDisabled();
      await nameInput.fill(newName);

      wallet.clearRequests();
      await detail.saveButton(dialog).click();
      await expect(
        pages.shell.toast("success").filter({ hasText: "Manager Badge updated successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(dialog).toHaveCount(0);

      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      const modified = parseEventLogs({
        abi: SocietyProtocolBadgesABI,
        eventName: "BadgeModified",
        logs: receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS)),
      });
      expect(modified).toHaveLength(1);
      expect(modified[0].args.id).toBe(community.managerBadgeId);
      expect(modified[0].args.name).toBe(newName);
      expect(await pins(), "nothing was pinned").toBe(pinsBefore);

      await expect(page.getByTestId("badge-card").filter({ hasText: newName })).toHaveCount(1);
      // Renaming the badge renames neither the community nor its manager.
      await expect(detail.name(community.name)).toBeVisible();
      expect(await chain.badgeBalance(me.address, community.managerBadgeId)).toBe(BigInt(1));
    },
  );

  test(
    "K12: transferring ownership warns that it cannot be undone, wants a confirmation, only hints at a wallet's Society address, and ends the manager's access",
    { tag: ["@edge", "@owner-tx"] },
    async ({ page, persona, actor, pages, wallet, aa, chain, s3, subgraph, seenText }) => {
      const detail = new CommunityDetailPage(page);
      const [me, heir] = await Promise.all([
        persona("fundedMember", { name: "K12 Outgoing" }),
        actor("member", { name: "K12 Incoming" }),
      ]);
      const community = await seedCommunity({ chain, s3, subgraph }, { manager: me.address });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await detail.open(community.id, "settings");
      await pages.shell.connect();
      await expect(page.getByText("Danger Zone", { exact: true })).toBeVisible();
      await detail.transferOwnershipButton.click();

      const dialog = detail.dialog("Transfer Ownership");
      const newOwner = dialog.getByLabel("New Owner Address");
      const confirm = dialog.getByLabel(/I understand this action cannot be undone/);
      const submit = detail.transferSubmit(dialog);
      await expect(dialog).toContainText("This action is irreversible.");
      await expect(dialog).toContainText(
        "You will lose manager access to this community immediately after the transaction confirms.",
      );
      await expect(confirm).not.toBeChecked();
      await expect(submit).toBeDisabled();

      // Not an address.
      await newOwner.fill("0x1234");
      await expect(dialog.getByText("Invalid address", { exact: true })).toBeVisible();

      // A wallet's address: the page names the Society address that belongs
      // to it, but offers no one-click Replace for a step that cannot be
      // undone, and leaves the field as typed.
      const hint = dialog.getByTestId("recipient-wallet-hint");
      await newOwner.fill(heir.ownerAddress);
      await expect(dialog.getByText("Invalid address", { exact: true })).toHaveCount(0);
      await expect(hint).toContainText(heir.address);
      await expect(dialog.getByRole("button", { name: "Replace" })).toHaveCount(0);
      await expect(newOwner).toHaveValue(heir.ownerAddress);

      // The Society address itself: nothing to hint at.
      await newOwner.fill(heir.address);
      await expect(hint).toHaveCount(0);

      // The address alone is not enough: the box must be ticked.
      await expect(submit).toBeDisabled();
      await confirm.check();
      await expect(submit).toBeEnabled();
      await confirm.uncheck();
      await expect(submit).toBeDisabled();
      await confirm.check();

      wallet.clearRequests();
      aa.clear();
      // The fake does not know who manages a community: it is told what
      // the subgraph records when the manager badge moves.
      const receipt = await indexAfter(
        { subgraph, wallet, chain },
        async () => {
          await submit.click();
          await expect(submit).toHaveText("Transferring...");
        },
        () => indexedManagerChange(community, heir.address),
      );

      await expect(
        pages.shell.transactionToast("success").filter({ hasText: "Community ownership transferred successfully" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(dialog).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // Manager access is gone at once: no Settings tab, none of its
      // content, and on the Members tab neither Revoke nor the panel.
      await expect(detail.tab("settings")).toHaveCount(0);
      await expect(detail.generalInformation).toHaveCount(0);
      await expect(detail.transferOwnershipButton).toHaveCount(0);
      await detail.openTab("members");
      await expect(detail.memberRow(me.address)).toContainText("(You)");
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined"]);
      await expect(detail.badgeActions).toHaveCount(0);

      // One transaction, no signature: the wallet paid, the Light Account
      // handed its manager badge to the new owner.
      const paid = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(paid.transactionHash).toBe(receipt.transactionHash);
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
      const [moved, ...others] = badgeTransfersIn(receipt);
      expect(others).toHaveLength(0);
      expect(moved.id).toBe(community.managerBadgeId);
      expect(isAddressEqual(moved.from, me.address)).toBe(true);
      expect(isAddressEqual(moved.to, heir.address)).toBe(true);
      expect(await chain.badgeBalance(heir.address, community.managerBadgeId)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.address, community.managerBadgeId)).toBe(BigInt(0));
      const isManager = (account: Address) =>
        chain.public.readContract({
          address: COMMUNITY_REGISTRY_ADDRESS,
          abi: CommunityRegistryAbi,
          functionName: "isManager",
          args: [community.id, account],
        });
      expect(await isManager(heir.address)).toBe(true);
      expect(await isManager(me.address)).toBe(false);
      // Still a member: the member badge did not move.
      expect(await chain.badgeBalance(me.address, community.memberBadgeId)).toBe(BigInt(1));
      await expectNeverAskedToFundSocietyAccount(seenText, me, {
        saw: "Community ownership transferred successfully",
      });
    },
  );

  test(
    "K13: an assistant gets no Settings and no manager controls on the community, and on the badges exactly what the badges allow",
    { tag: ["@edge"] },
    async ({ page, persona, actor, pages, chain, s3, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const deps = { chain, s3, subgraph };
      const [me, manager, someone] = await Promise.all([
        persona("member", { name: "K13 Assistant" }),
        actor("member", { name: "K13 Manager" }),
        actor("member", { name: "K13 Somebody" }),
      ]);
      const community = await seedCommunity(deps, { manager: manager.address });
      await addAssistant(deps, community, me.address);
      // Also a member, as an assistant usually is. It changes nothing about what the assistant may do.
      await addMember(deps, community, me.address);

      // The contract's own answer: an assistant may mint the member badge, and not the assistant badge.
      expect(await mayMint(chain, me.address, community.memberBadgeId, someone.address)).toBe(true);
      expect(await mayMint(chain, me.address, community.assistantBadgeId, someone.address)).toBe(false);

      // The community's page: a link to the settings shows none, and the
      // Members tab has no controls. The "(You)" says the page knows who is connected.
      await detail.open(community.id, "settings");
      await pages.shell.connect();
      await expect(detail.name(community.name)).toBeVisible();
      await detail.openTab("members");
      await expect(detail.memberRow(me.address)).toContainText("(You)");
      await expect(detail.memberRow(manager.address)).toContainText("K13 Manager");
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined"]);
      await expect(detail.badgeActions).toHaveCount(0);
      await expect(detail.tab("settings")).toHaveCount(0);
      await expect(detail.generalInformation).toHaveCount(0);
      await detail.openTab("badges");
      await expect(detail.badgeCards).toHaveCount(3);
      await expect(detail.createBadgeLink).toHaveCount(0);
      const badgeLink = (badgeId: bigint, name: string) =>
        detail.badgeCard(badgeId).getByRole("link").filter({ hasText: name });

      // The assistant badge's own page: the assistant holds it, and may do
      // nothing with it (only the manager mints and burns it). The page's
      // holders and its actions come from the same answer, so once the
      // holder is listed the absence of actions is final.
      await badgeLink(community.assistantBadgeId, `${community.name} Assistant`).click();
      await expect(page).toHaveURL(new RegExp(`/badges/${community.assistantBadgeId}$`));
      await expect(pages.badge.holders.row(me.address)).toBeVisible();
      await expect(pages.badge.actionTabs).toHaveCount(0);

      // The member badge's page: Mint and Burn, as the badge allows its
      // assistants. Nobody can transfer it.
      await page.goBack();
      await expect(detail.badgeCards).toHaveCount(3);
      await badgeLink(community.memberBadgeId, `${community.name} Member`).click();
      await expect(page).toHaveURL(new RegExp(`/badges/${community.memberBadgeId}$`));
      await expect(pages.badge.holders.row(me.address)).toBeVisible();
      await expect(pages.badge.actionTabs.getByRole("tab")).toHaveText(["Mint", "Burn"]);
    },
  );

  test(
    "K13: a plain member gets no Settings, no manager controls, and no actions on the community's badges",
    { tag: ["@edge"] },
    async ({ page, persona, actor, pages, chain, s3, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const deps = { chain, s3, subgraph };
      const [me, manager, someone] = await Promise.all([
        persona("member", { name: "K13 Member" }),
        actor("member", { name: "K13 Their Manager" }),
        actor("member", { name: "K13 Outsider" }),
      ]);
      const community = await seedCommunity(deps, { manager: manager.address });
      await addMember(deps, community, me.address);
      expect(await mayMint(chain, me.address, community.memberBadgeId, someone.address)).toBe(false);
      // The same check passes for the manager: the check itself works.
      expect(await mayMint(chain, manager.address, community.memberBadgeId, someone.address)).toBe(true);

      await detail.open(community.id, "settings");
      await pages.shell.connect();
      await expect(detail.name(community.name)).toBeVisible();
      await detail.openTab("members");
      await expect(detail.memberRow(me.address)).toContainText("(You)");
      await expect(detail.memberRows).toHaveCount(2);
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined"]);
      await expect(detail.badgeActions).toHaveCount(0);
      await expect(detail.tab("settings")).toHaveCount(0);
      await expect(detail.generalInformation).toHaveCount(0);

      // The member badge's own page: the member holds it, and may do nothing with it.
      await detail.openTab("badges");
      await detail.badgeCard(community.memberBadgeId).getByRole("link").filter({ hasText: `${community.name} Member` }).click();
      await expect(page).toHaveURL(new RegExp(`/badges/${community.memberBadgeId}$`));
      await expect(pages.badge.holders.row(me.address)).toBeVisible();
      await expect(pages.badge.actionTabs).toHaveCount(0);
    },
  );
});
