import { isAddressEqual } from "viem";
import { CommunityRegistryAbi } from "../../../src/abis/CommunityRegistry";
import { BADGES_ADDRESS, CHAIN_ID, COMMUNITY_REGISTRY_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { cidOf } from "../../support/backends/s3";
import { badge } from "../../support/builders/entities";
import { BadgeCreateForm } from "../../support/pages/badge-create-form";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectOwnerSentDirectly,
} from "../../support/write-route";
import { indexAfter } from "../community-detail/steps";
import { PNG, badgeCreatedIn, uploads } from "./steps";

/**
 * Creating a badge as a member whose Light Account exists.
 *
 * createBadge and createCommunityBadge are not sponsored. The Light Account
 * (the Society address) is the creator, and the owner wallet pays: one
 * ordinary transaction from the wallet to the Light Account's execute. Only
 * a call that the Light Account may not make but the wallet may (an official
 * badge when the role is on the wallet) goes from the wallet straight to
 * the contract. A badge with an image or metadata first signs the upload
 * authentication, so its wallet log holds one signature.
 *
 * A new user's first badge (two transactions, or no ETH) is in
 * create-badge-routing.spec.ts.
 */

const CREATED = "Badge created successfully";

test.describe("badge creation", () => {
  test(
    "I1: /create-badge asks a visitor to connect, and a member on the wrong network to switch, before it shows the wizard",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet, aa }) => {
      await persona("member");
      const form = new BadgeCreateForm(page);

      // Logged out: the prompt, and nothing of the wizard.
      await form.open();
      await expect(pages.shell.connectPrompt).toBeVisible();
      await expect(pages.shell.connectPrompt).toContainText("Please connect your wallet to create a badge.");
      await expect(form.heading).toBeHidden();
      await expect(form.nameInput).toBeHidden();

      // Connected on Sepolia: the wizard.
      await pages.shell.connect();
      await expect(form.heading).toBeVisible();
      await expect(form.nameInput).toBeVisible();
      await expect(pages.shell.connectPrompt).toBeHidden();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      wallet.clearRequests();
      await wallet.setChainId(1);
      await expect(pages.shell.wrongNetworkPrompt).toBeVisible();
      await expect(pages.shell.wrongNetworkPrompt).toContainText("You are connected to the wrong network.");
      await expect(pages.shell.wrongNetworkPrompt).toContainText("Please switch to Sepolia to continue.");
      await expect(pages.shell.switchNetworkButton).toHaveText("Switch to Sepolia");
      await expect(form.heading).toBeHidden();
      await expect(form.nameInput).toBeHidden();
      await expect(form.nextButton).toBeHidden();

      // Switching back from the prompt brings the wizard back.
      await pages.shell.switchNetworkButton.click();
      await expect(pages.shell.wrongNetworkPrompt).toBeHidden();
      await expect(form.heading).toBeVisible();
      await expect(form.nameInput).toBeVisible();
      expect(
        wallet.requestsOf("wallet_switchEthereumChain").map((request) => [
          Number((request.params as [{ chainId: string }])[0].chainId),
          request.outcome,
        ]),
      ).toEqual([[CHAIN_ID, "ok"]]);
      expect(wallet.reportedChainId).toBe(CHAIN_ID);

      // None of this signed or sent anything.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
    },
  );

  test(
    "I2: a member creates a badge with an image, metadata, permissions and managers, and lands on the new badge",
    { tag: ["@smoke", "@owner-tx"] },
    async ({ persona, nextAccount, pages, page, wallet, aa, chain, s3, subgraph, seenText }) => {
      const me = await persona("fundedMember");
      const suffix = me.address.slice(2, 8);
      const name = `E2E Created ${suffix}`;
      const description = `Created by the browser test ${suffix}.`;
      // A badge of the member's own, to name as the one whose holders may
      // mint and burn the new badge. Found in the pickers by its name.
      const gateName = `E2E Gate ${suffix}`;
      const gate = await chain.createBadge({ creator: me.address, name: gateName, uri: "" });
      await subgraph.sync();
      const coManager = nextAccount().address;
      const stranger = nextAccount().address;

      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();

      // Badge Info: picture, name and metadata.
      await form.chooseImage({ name: "badge.png", mimeType: "image/png", buffer: PNG });
      await expect(form.imagePreview).toHaveAttribute("data-has-image", "true");
      await form.nameInput.fill(name);
      await form.metadataInput.fill(JSON.stringify({ description }));
      await expect(form.imageMessage).toBeHidden();
      await form.nextButton.click();
      await form.finishButton.waitFor();

      // Permissions: holders of the gate badge may mint and burn, nobody may
      // transfer, and two accounts may manage.
      await form.pickPermissionBadge("minters", gateName);
      await form.pickPermissionBadge("burners", gateName);
      await form.addEditor(me.address);
      await form.addEditor(coManager);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const uploadsBefore = uploads(await s3.requests()).length;
      wallet.clearRequests();
      aa.clear();
      await form.finishButton.click();

      await expect(pages.shell.toast("success").filter({ hasText: CREATED })).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One signature (the upload authentication) and one transaction, from
      // the wallet through the Light Account, paid by the wallet. Nothing
      // was sponsored.
      const receipt = await expectOwnerPaidThroughAccount(
        { wallet, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expect(aa.userOperations(), "no user operation").toHaveLength(0);
      expect(aa.paymasterCalls(), "no sponsorship asked for").toHaveLength(0);

      // The badge on chain: created by the Light Account, with the rules and
      // the managers chosen in the wizard.
      const created = badgeCreatedIn(receipt);
      expect(created.name).toBe(name);
      expect(created.isOfficial).toBe(false);
      expect(created.isCommunityBadge).toBe(false);
      expect(isAddressEqual(created.creator, me.address), "created by the Light Account").toBe(true);
      expect(await chain.read("getBadgeMinters", [created.id])).toEqual([gate]);
      expect(await chain.read("getBadgeBurners", [created.id])).toEqual([gate]);
      expect(await chain.read("getBadgeTransferers", [created.id])).toEqual([]);
      expect(await chain.read("canEdit", [created.id, me.address]), "the creator may manage").toBe(true);
      expect(await chain.read("canEdit", [created.id, coManager]), "the second manager may manage").toBe(true);
      expect(await chain.read("canEdit", [created.id, stranger]), "nobody else may").toBe(false);

      // Its metadata: what was typed, and the picture pinned by itself and
      // referred to by URL.
      const metadata = await s3.getJson<{ description: string; imageUrl: string }>(
        cidOf(await chain.read("uri", [created.id])),
      );
      expect(metadata).toMatchObject({ description });
      expect(metadata!.imageUrl).toMatch(/^https:\/\/.+\/ipfs\/[a-z0-9]+$/);
      expect((await s3.get(cidOf(metadata!.imageUrl)))?.equals(PNG), "the pinned image is the chosen file").toBe(true);
      expect(uploads(await s3.requests()).length - uploadsBefore, "the image and the metadata were pinned").toBe(2);

      // The subgraph fake has followed the chain: the page waited for it
      // before it said "created".
      const indexed = await subgraph.entity("Badge", created.id.toString());
      expect(indexed).toMatchObject({
        name,
        isOfficial: false,
        isCommunity: false,
        creatorAddress: me.address.toLowerCase(),
        minters: [gate.toString()],
        burners: [gate.toString()],
        transferers: [],
      });
      expect((await subgraph.entity("User", coManager))?.managedBadges).toContain(created.id.toString());
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: CREATED });

      // After "Badge created successfully" the wizard goes to the new badge.
      await expect(page).toHaveURL(new RegExp(`/badges/${created.id}$`));
      await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
      await expect(page.getByText(description, { exact: true })).toBeVisible();
      // "Who can Mint" and "Who can Burn" each link to the gate badge.
      await expect(page.getByRole("link", { name: `View badge “${gateName}” (ID #${gate})` })).toHaveCount(2);
      await expect(page.getByRole("button", { name: "Manage", exact: true })).toBeVisible();
    },
  );

  test(
    "I4: a member without the official-badge role is not offered \"Official Badge\"",
    { tag: ["@core"] },
    async ({ persona, pages, page, chain }) => {
      const me = await persona("member");
      const role = await chain.read("OFFICIAL_BADGE_CREATOR_ROLE");
      expect(await chain.read("hasRole", [role, me.address])).toBe(false);
      expect(await chain.read("hasRole", [role, me.ownerAddress])).toBe(false);

      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      // The account the role is looked up for is known...
      const menu = await pages.shell.readAccountMenu();
      expect(menu.society?.toLowerCase()).toBe(me.address.toLowerCase());
      // ...and the lookup is over: the fields are disabled while it runs.
      await expect(form.nameInput).toBeEnabled();
      await form.nameInput.fill("Not Official");
      await expect(form.metadataInput).toBeEnabled();
      await expect(form.officialCheckbox).toHaveCount(0);
      await expect(form.preview).toContainText("INDIVIDUAL");
      await expect(form.preview).not.toContainText("OFFICIAL");
    },
  );

  test(
    "I4: a holder of the official-badge role creates an official badge as the Society address",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, seenText }) => {
      const me = await persona("officialBadgeCreator");
      const name = `E2E Official ${me.address.slice(2, 8)}`;

      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      await expect(form.officialCheckbox).toBeVisible();
      await expect(form.officialCheckbox).not.toBeChecked();
      await form.nameInput.fill(name);
      await expect(form.preview).toContainText("INDIVIDUAL");

      await form.officialCheckbox.check();
      await expect(form.preview).toContainText("OFFICIAL");
      await expect(form.preview).not.toContainText("INDIVIDUAL");
      await form.nextButton.click();
      await form.finishButton.waitFor();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await form.finishButton.click();
      await expect(pages.shell.transactionToast("success")).toHaveText(CREATED, { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The role is on the Light Account, so it makes the call and the
      // wallet pays: no signature (nothing to pin), one transaction.
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.userOperations(), "no user operation").toHaveLength(0);
      const created = badgeCreatedIn(receipt);
      expect(created.name).toBe(name);
      expect(created.isOfficial, "official in the event").toBe(true);
      expect(isAddressEqual(created.creator, me.address), "created by the Light Account").toBe(true);
      const [, , isOfficial] = await chain.read("badges", [created.id]);
      expect(isOfficial, "official on chain").toBe(true);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: CREATED });

      // The badge's page shows it as official. (Opened by its address: the
      // wizard does not go there by itself, see I2.)
      await pages.badge.open(created.id);
      await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
      await expect(pages.badge.officialLabel).toBeVisible();
    },
  );

  test(
    "I4: when only the wallet holds the official-badge role, the checkbox is offered and the wallet itself creates the official badge",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, seenText }) => {
      const me = await persona("fundedMember");
      // A role granted before the member had a Society address stays on the wallet.
      await chain.grantBadgesRole("OFFICIAL_BADGE_CREATOR_ROLE", me.ownerAddress);
      const role = await chain.read("OFFICIAL_BADGE_CREATOR_ROLE");
      expect(await chain.read("hasRole", [role, me.address]), "the Light Account has no role").toBe(false);
      const name = `E2E Wallet Official ${me.address.slice(2, 8)}`;

      const form = new BadgeCreateForm(page);
      await form.open();
      await pages.shell.connect();
      await expect(form.officialCheckbox).toBeVisible();
      await form.nameInput.fill(name);
      await form.officialCheckbox.check();
      await expect(form.preview).toContainText("OFFICIAL");
      await form.nextButton.click();
      await form.finishButton.waitFor();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await form.finishButton.click();
      await expect(pages.shell.transactionToast("success")).toHaveText(CREATED, { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The Light Account may not create an official badge and the wallet
      // may, so the wallet sends the call straight to the badges contract.
      const receipt = await expectOwnerSentDirectly(
        { wallet, chain },
        { persona: me, to: BADGES_ADDRESS, ownerBalanceBefore },
      );
      expect(aa.userOperations(), "no user operation").toHaveLength(0);
      const created = badgeCreatedIn(receipt);
      expect(created.name).toBe(name);
      expect(created.isOfficial).toBe(true);
      expect(isAddressEqual(created.creator, me.ownerAddress), "created by the wallet").toBe(true);
      const [, , isOfficial] = await chain.read("badges", [created.id]);
      expect(isOfficial, "official on chain").toBe(true);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: CREATED });
    },
  );

  test(
    "I5: a community manager creates a community badge from /communities/<id>/create-badge and lands on the community's Badges tab",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain, subgraph, seenText }) => {
      // A fundedMember whose Society address manages `community`, a
      // community created on chain through the CommunityRegistry.
      const me = await persona("communityManager");
      const community = me.community!;
      const name = `E2E Community Badge ${me.address.slice(2, 8)}`;
      const registryRead = <T>(functionName: "getCommunityBadges" | "isManager", args: readonly unknown[]) =>
        chain.public.readContract({
          address: COMMUNITY_REGISTRY_ADDRESS,
          abi: CommunityRegistryAbi,
          functionName,
          args,
        } as never) as Promise<T>;
      expect(await registryRead<boolean>("isManager", [community.id, me.address]), "the persona manages it").toBe(true);
      const badgesBefore = await registryRead<readonly bigint[]>("getCommunityBadges", [community.id]);

      const form = new BadgeCreateForm(page);
      await form.openForCommunity(community.id);
      await pages.shell.connect();
      await expect(form.heading).toBeVisible();
      await form.nameInput.fill(name);
      // The preview already marks it as a community badge.
      await expect(form.preview).toContainText("COMMUNITY");
      await form.nextButton.click();
      await form.finishButton.waitFor();
      // A community badge has no managers of its own: the community's manager manages it.
      await expect(form.permissionLabel("Who can Mint:")).toBeVisible();
      await expect(form.permissionLabel("Who can Manage:")).toHaveCount(0);
      await expect(form.editorsInput).toHaveCount(0);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      // The fake follows the badges contract (the new badge and its
      // permissions) but not the registry, so it is told what the real
      // subgraph records for createCommunityBadge: the badge's link to the
      // community, which is what the community's Badges tab lists.
      await indexAfter(
        { subgraph, wallet, chain },
        () => form.finishButton.click(),
        async (mined) => {
          await subgraph.sync();
          return [badge(badgeCreatedIn(mined).id, { community: community.id.toString() })];
        },
      );
      await expect(pages.shell.transactionToast("success")).toHaveText(CREATED, { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // createCommunityBadge on the registry, made by the Light Account and
      // paid by the wallet.
      const receipt = await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.userOperations(), "no user operation").toHaveLength(0);
      const created = badgeCreatedIn(receipt);
      expect(created.name).toBe(name);
      expect(created.isCommunityBadge, "a community badge in the event").toBe(true);
      const [, , , isCommunityBadge] = await chain.read("badges", [created.id]);
      expect(isCommunityBadge, "a community badge on chain").toBe(true);
      const badgesAfter = await registryRead<readonly bigint[]>("getCommunityBadges", [community.id]);
      expect(badgesAfter, "the community's badges").toEqual([...badgesBefore, created.id]);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: CREATED });

      // After "Badge created successfully" the wizard goes to the
      // community's Badges tab, which lists the new badge.
      await expect(page).toHaveURL(new RegExp(`/communities/${community.id}\\?tab=badges$`));
      // The tab's cards are CommunityBadge ("community-badge"), not the
      // BadgeCard of /badges and the profile ("badge-card").
      await expect(pages.communityDetail.badgeCard(created.id)).toContainText(name);
    },
  );
});
