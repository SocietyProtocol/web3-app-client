import type { Address } from "viem";
import { CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { BADGE_PICTURE_SVG } from "../../support/builders/badges-seed";
import { BadgeDetailPanel } from "../../support/pages/badges-detail";

/**
 * /badges/<id>: what the page shows about one badge, apart from the
 * holders' amounts (badge-detail.spec.ts): the badge itself, the page for
 * a badge that does not exist, the holders list and its modal, who may do
 * what, the Actions area for a visitor who may do nothing, and the page
 * when the chain cannot be read.
 */

/** "0x1234...abcdef": how the app shortens an address that has no name. */
const shortened = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`;

test.describe("badge page", () => {
  test(
    "G5: a badge's page shows its picture, id, name, description, metadata link and creator",
    { tag: ["@smoke"] },
    async ({ actor, page, pages, chain, s3, subgraph, nextAccount }) => {
      const creator = await actor("member", { name: `Badge Maker ${nextAccount().address.slice(2, 8)}` });
      const name = `E2E Pictured ${creator.address.slice(2, 8).toLowerCase()}`;
      const description = "A badge with a picture and a description, made for one browser test.";
      const picture = await s3.put(BADGE_PICTURE_SVG, "image/svg+xml");
      const { uri } = await s3.putJson({ name, description, imageUrl: picture.uri });
      const badgeId = await chain.createBadge({ creator: creator.address, name, uri });
      await subgraph.sync();

      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(badgeId);
      await expect(page).toHaveTitle(new RegExp(`Badge #${badgeId}\\b`));

      await expect(detail.name).toHaveText(name);
      await expect(detail.idChip(badgeId)).toBeVisible();
      await expect(page.getByText(description, { exact: true })).toBeVisible();
      // An individual badge: neither label.
      await expect(pages.badge.officialLabel).toHaveCount(0);
      await expect(pages.badge.communityLabel).toHaveCount(0);

      // The picture is the one the metadata names, and it loaded.
      const image = detail.image(name);
      await expect(image).toHaveAttribute("src", picture.uri);
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);

      await expect(detail.metadataLink).toHaveAttribute("href", uri);
      await expect(detail.metadataLink).toHaveAttribute("target", "_blank");

      await expect(detail.creatorLink).toHaveAttribute("href", `/user/${creator.address.toLowerCase()}`);
      await expect(detail.creatorLink).toContainText(creator.profile!.name);
      // Not the visitor's badge to manage.
      await expect(detail.manageButton).toHaveCount(0);

      // Nobody holds it yet.
      await expect(pages.badge.holders.section).toContainText("Holders (0)");
      await expect(pages.badge.holders.section).toContainText("No holders found");
    },
  );

  test(
    "G5: an official badge without picture or description says so and shows the official picture",
    { tag: ["@core"] },
    async ({ actor, page, pages, chain, s3, subgraph }) => {
      const creator = await actor("officialBadgeCreator");
      const name = `E2E Plain Official ${creator.address.slice(2, 8).toLowerCase()}`;
      const { uri } = await s3.putJson({ name });
      const badgeId = await chain.createBadge({ creator: creator.address, name, uri, isOfficial: true });
      await subgraph.sync();

      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(badgeId);

      await expect(detail.name).toHaveText(name);
      await expect(detail.idChip(badgeId)).toBeVisible();
      await expect(pages.badge.officialLabel).toBeVisible();
      await expect(pages.badge.communityLabel).toHaveCount(0);
      await expect(page.getByText("No description provided", { exact: true })).toBeVisible();
      await expect(detail.image(name)).toHaveAttribute("src", "/official-badge.svg");
      await expect(detail.metadataLink).toHaveAttribute("href", uri);
      await expect(detail.creatorLink).toHaveAttribute("href", `/user/${creator.address.toLowerCase()}`);
    },
  );

  for (const [what, id] of [
    ["a number no badge has", "999999999999"],
    ["something that is not a number", "not-a-badge"],
  ] as const) {
    test(`G6: /badges/<${what}> is the 404 page`, { tag: ["@core"] }, async ({ page, pages }) => {
      const response = await page.goto(`/badges/${id}`);
      expect(response?.status()).toBe(404);

      await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
      await expect(page.getByText("The page you are looking for doesn't exist or has been moved.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
      // Nothing of a badge page.
      await expect(pages.badge.holders.section).toHaveCount(0);
      await expect(page.getByTestId("badge-actions")).toHaveCount(0);
    });
  }

  test(
    "G9: six holders fit on the page; with more, the rest are counted and View All Holders opens them all",
    { tag: ["@core"] },
    async ({ actor, page, pages, chain, s3, subgraph, nextAccount }) => {
      const creator = await actor("member");
      const name = `E2E Many Holders ${creator.address.slice(2, 8).toLowerCase()}`;
      const { uri } = await s3.putJson({ name, description: "A badge with eight holders, made for one browser test." });
      const badgeId = await chain.createBadge({
        creator: creator.address,
        name,
        uri,
        minters: [creator.profile!.badgeId],
      });
      // Holders without a profile: the page shows them by address.
      const holders = Array.from({ length: 8 }, () => nextAccount().address.toLowerCase() as Address);
      await chain.writeBadgesAs(creator.address, "mintToMultiple", [holders.slice(0, 6), badgeId, BigInt(1), "0x"]);
      await subgraph.sync();

      const list = pages.badge.holders;
      await pages.badge.open(badgeId);

      // Exactly six: all on the page, nothing to open.
      await expect(list.section).toContainText("Holders (6)");
      await expect(list.rows).toHaveCount(6);
      expect((await list.addresses()).sort()).toEqual(holders.slice(0, 6).sort());
      await expect(list.viewAllButton).toHaveCount(0);
      await expect(list.section).not.toContainText("more holders");

      // Two more holders.
      await chain.writeBadgesAs(creator.address, "mintToMultiple", [holders.slice(6), badgeId, BigInt(1), "0x"]);
      await subgraph.sync();
      await page.reload();

      await expect(list.section).toContainText("Holders (8)");
      await expect(list.rows).toHaveCount(6);
      await expect(list.section).toContainText("And 2 more holders...");
      await expect(list.viewAllButton).toBeVisible();
      const onPage = await list.addresses();
      for (const address of onPage) expect(holders).toContain(address);
      // A holder's card leads to their profile.
      await expect(
        list.section.getByRole("link", { name: `User profile link for ${shortened(onPage[0])}`, exact: true }),
      ).toHaveAttribute("href", `/user/${onPage[0]}`);

      // The modal: titled after the badge, every holder once, across its pages.
      await list.openModal();
      await expect(list.modal).toContainText(`Holders of ${name}`);
      expect((await list.allAddressesInModal()).sort()).toEqual([...holders].sort());
      const card = await list.findInModal(holders[7]);
      await expect(card).toContainText(shortened(holders[7]));
      await expect(pages.badge.holderAmountChip(card)).toHaveText("1 / 8");

      await list.closeModal();
      await expect(list.rows).toHaveCount(6);
    },
  );

  test(
    "G10: the permission rows name the badges whose holders may mint, burn and transfer, and the managers",
    { tag: ["@core"] },
    async ({ actor, page, pages, chain, s3, subgraph }) => {
      const [creator, comanager] = await Promise.all([
        actor("member", { name: "Permission Creator" }),
        actor("member", { name: "Permission Comanager" }),
      ]);
      const suffix = creator.address.slice(2, 8).toLowerCase();
      const roleName = `E2E Stewards ${suffix}`;
      const name = `E2E Governed ${suffix}`;
      const { uri } = await s3.putJson({ name, description: "A badge with permission rules, made for one browser test." });
      const profileBadge = creator.profile!.badgeId;
      const roleBadge = await chain.createBadge({ creator: creator.address, name: roleName, uri });
      // Mint: the creator themself, or a holder of the role badge. Burn: a
      // holder of the role badge. Transfer: nobody. Manage: two members.
      const badgeId = await chain.createBadge({
        creator: creator.address,
        name,
        uri,
        minters: [profileBadge, roleBadge],
        burners: [roleBadge],
        transferers: [],
        editors: [creator.address, comanager.address],
      });
      await subgraph.sync();
      expect(await chain.read("getBadgeMinters", [badgeId])).toEqual([profileBadge, roleBadge]);

      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(badgeId);
      await expect(detail.name).toHaveText(name);

      // Who can Mint: a member's profile badge reads "User (<name>)".
      const mint = detail.permission("Who can Mint:");
      await expect(mint).toContainText("Holders of:");
      await expect(mint.getByRole("link")).toHaveCount(2);
      const self = detail.permissionBadge(mint, profileBadge);
      await expect(self).toHaveAttribute("href", `/badges/${profileBadge}`);
      await expect(self).toContainText(`#${profileBadge}`);
      await expect(self).toContainText(`User (${creator.profile!.name})`);
      const role = detail.permissionBadge(mint, roleBadge);
      await expect(role).toHaveAttribute("href", `/badges/${roleBadge}`);
      await expect(role).toContainText(`#${roleBadge}`);
      await expect(role).toContainText(roleName);

      const burn = detail.permission("Who can Burn:");
      await expect(burn.getByRole("link")).toHaveCount(1);
      await expect(detail.permissionBadge(burn, roleBadge)).toContainText(roleName);

      const transfer = detail.permission("Who can Transfer:");
      await expect(transfer).toContainText("No one");
      await expect(transfer).not.toContainText("Holders of:");
      await expect(transfer.getByRole("link")).toHaveCount(0);

      // Who can Manage: users, each a link to their profile.
      await expect(detail.managers).toContainText("Who can Manage:");
      await expect(detail.managers).toContainText("Managers:");
      await expect(detail.managers.getByRole("link")).toHaveCount(2);
      await expect(detail.manager(creator.profile!.name)).toHaveAttribute(
        "href",
        `/user/${creator.address.toLowerCase()}`,
      );
      await expect(detail.manager(comanager.profile!.name)).toHaveAttribute(
        "href",
        `/user/${comanager.address.toLowerCase()}`,
      );

      // A badge in a row leads to that badge's page.
      await role.click();
      await expect(page).toHaveURL(new RegExp(`/badges/${roleBadge}$`));
      await expect(detail.name).toHaveText(roleName);
      await expect(detail.permission("Who can Mint:")).toContainText("No one");
    },
  );

  test(
    "G11: a member who may not mint, burn or transfer sees the Actions title and nothing to act with",
    { tag: ["@core"] },
    async ({ persona, actor, page, pages, wallet }) => {
      const [me, issuer] = await Promise.all([persona("member"), actor("badgeMinter")]);
      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(issuer.badge!.id);
      await pages.shell.connect();

      // The page is loaded: the holder and the rules are there.
      await expect(pages.badge.holders.row(issuer.holder!.address)).toBeVisible();
      await expect(detail.permission("Who can Mint:")).toContainText(`User (${issuer.profile!.name})`);
      await expect(detail.permission("Who can Mint:")).not.toContainText(me.profile!.name);

      await expect(detail.actions).toHaveText("Actions");
      await expect(detail.actionTabs).toHaveCount(0);
      await expect(pages.badge.mintRecipientInput).toHaveCount(0);
      await expect(detail.actionsConnectPrompt).toHaveCount(0);
      await expect(detail.actionsWrongNetworkPrompt).toHaveCount(0);
      await expect(detail.manageButton).toHaveCount(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "G11: logged out, the Actions area asks to connect a wallet",
    { tag: ["@core"] },
    async ({ actor, page, pages }) => {
      const issuer = await actor("badgeMinter");
      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(issuer.badge!.id);
      await expect(pages.badge.holders.row(issuer.holder!.address)).toBeVisible();

      // Nothing to act with while logged out.
      await expect(detail.actions).toContainText("Actions");
      await expect(detail.actionTabs).toHaveCount(0);
      await expect(pages.badge.mintRecipientInput).toHaveCount(0);

      // APP BUG, expected to fail until it is fixed: a logged-out visitor
      // gets the bare "Actions" title and no prompt. BadgeActions returns
      // early when the visitor has no permission, before it reaches the
      // ContentGuard that holds the prompt ("Connect your wallet to perform
      // badge actions"), and without a wallet nobody has a permission: that
      // prompt can never be shown. Everything above this line must pass;
      // only the assertions below are expected to fail.
      test.fail(true, "logged out, the Actions area shows no prompt to connect (BadgeActions returns before its ContentGuard)");
      // Short on purpose: a fixed app has the prompt on screen already.
      // Remove these timeouts together with test.fail.
      await expect(detail.actionsConnectPrompt).toBeVisible({ timeout: 2_000 });
      await expect(detail.actionsConnectPrompt).toContainText("Connect your wallet to perform badge actions", {
        timeout: 2_000,
      });
    },
  );

  test(
    "G11: on the wrong network the Actions area shows the prompt to switch in place of the tabs",
    { tag: ["@core"] },
    async ({ persona, page, pages, wallet }) => {
      const me = await persona("badgeMinter");
      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(me.badge!.id);
      await pages.shell.connect();
      await expect(pages.badge.mintTab).toBeVisible();

      // The user changes network in the wallet (mainnet; the app runs on Sepolia).
      await wallet.setChainId(1);
      await expect(detail.actionsWrongNetworkPrompt).toBeVisible();
      await expect(detail.actionsWrongNetworkPrompt).toContainText(
        "Switch to the correct network to perform badge actions",
      );
      await expect(detail.actionsWrongNetworkPrompt).toContainText("Please switch to Sepolia to continue.");
      await expect(pages.badge.actionTabs).toHaveCount(0);
      await expect(pages.badge.mintRecipientInput).toHaveCount(0);
      // The rest of the page is still there.
      await expect(detail.name).toHaveText(me.badge!.name);
      await expect(pages.badge.holders.row(me.holder!.address)).toBeVisible();

      // The prompt's button asks the wallet for Sepolia, and the tabs are back.
      wallet.clearRequests();
      await detail.actionsWrongNetworkPrompt.getByTestId("wallet-switch-network").click();
      await expect(detail.actionsWrongNetworkPrompt).toHaveCount(0);
      await expect(pages.badge.mintTab).toBeVisible();
      expect(
        wallet.requestsOf("wallet_switchEthereumChain").map((request) => [
          Number((request.params as [{ chainId: string }])[0].chainId),
          request.outcome,
        ]),
      ).toEqual([[CHAIN_ID, "ok"]]);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "G12: when the chain cannot be read the holders are listed without amounts, and the page still works",
    { tag: ["@edge"] },
    async ({ actor, page, pages, chain, network }) => {
      const issuer = await actor("badgeMinter");
      const badge = issuer.badge!;
      const holder = issuer.holder!;
      expect(await chain.badgeBalance(holder.address, badge.id)).toBe(BigInt(1));

      // Every contract read of the page fails: balances and the total supply.
      const fault = network.failRpc({ method: "eth_call" });
      const detail = new BadgeDetailPanel(page);
      await pages.badge.open(badge.id);

      // The badge and its holder come from the subgraph and are all there.
      await expect(detail.name).toHaveText(badge.name);
      await expect(detail.idChip(badge.id)).toBeVisible();
      await expect(pages.badge.holders.section).toContainText("Holders (1)");
      const card = pages.badge.holders.row(holder.address);
      await expect(card).toContainText(holder.profile!.name);
      await expect(detail.permission("Who can Mint:")).toContainText(`User (${issuer.profile!.name})`);

      // The reads were made and failed: no amount on the card, and no error
      // in place of the page.
      await expect.poll(() => fault.hits()).toBeGreaterThan(0);
      await expect(pages.badge.holderAmountChip(card)).toHaveCount(0);
      await expect(page.getByText("Something went wrong")).toHaveCount(0);

      // With the chain back the amount is there: it was the failed read that kept it away.
      fault.release();
      await page.reload();
      await expect(pages.badge.holderAmountChip(pages.badge.holders.row(holder.address))).toHaveText("1 / 1");
    },
  );
});
