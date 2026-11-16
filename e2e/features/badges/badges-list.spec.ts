import type { Address } from "viem";
import { expect, test, type Persona } from "../../fixtures";
import type { S3Fake } from "../../support/backends/s3";
import type { SubgraphFake } from "../../support/backends/subgraph";
import { manyBadges } from "../../support/builders/badges-seed";
import { badge } from "../../support/builders/entities";
import type { Chain } from "../../support/chain/chain";
import { BadgesListPage } from "../../support/pages/badges-list";

/**
 * /badges: the list of badges.
 *
 * The list is read from the subgraph only. It opens on the "All" tab with
 * the Official category switched on and nothing else, newest first. The
 * forked chain has no official badge, so a test that looks at the default
 * view makes one. Every test finds its own badges by a search word nobody
 * else uses, because the chain is shared and other tests add badges to it.
 */

const ALL_CATEGORIES = "category=official,community,individual";

type Seed = {
  actor: (kind: "member" | "officialBadgeCreator") => Promise<Persona>;
  chain: Chain;
  s3: S3Fake;
  subgraph: SubgraphFake;
  nextAccount: () => { address: Address };
};

/**
 * Four badges that share a search word, one of each category and one by
 * somebody else:
 *
 *   "<word> Charlie"  official     by `creator`  1 holder
 *   "<word> Alpha"    individual   by `creator`  no holder
 *   "<word> Bravo"    community    by `creator`  2 holders
 *   "<word> Delta"    individual   by `other`    no holder
 *
 * They are created on chain in that order. "Bravo" is a community badge in
 * the subgraph only (an overlay: the list never asks the chain), and the
 * creation times are set by overlay as well, so that "newest first" does
 * not depend on how fast the local chain mined them.
 */
async function seedCatalog({ actor, chain, s3, subgraph, nextAccount }: Seed) {
  const [creator, other] = await Promise.all([actor("officialBadgeCreator"), actor("member")]);
  const word = `e2e${nextAccount().address.slice(2, 10).toLowerCase()}`;
  const { uri } = await s3.putJson({ name: word, description: "Made for the badges list tests." });
  const byCreator = { creator: creator.address, uri, minters: [creator.profile!.badgeId] };

  const charlie = await chain.createBadge({ ...byCreator, name: `${word} Charlie`, isOfficial: true });
  const alpha = await chain.createBadge({ ...byCreator, name: `${word} Alpha` });
  const bravo = await chain.createBadge({ ...byCreator, name: `${word} Bravo` });
  const delta = await chain.createBadge({ creator: other.address, uri, name: `${word} Delta` });

  const [first, second] = [nextAccount().address, nextAccount().address];
  await chain.writeBadgesAs(creator.address, "mintToMultiple", [[first, second], bravo, BigInt(1), "0x"]);
  await chain.writeBadgesAs(creator.address, "mint", [first, charlie, BigInt(1), "0x"]);
  await subgraph.sync();

  const now = Math.floor(Date.now() / 1000);
  await subgraph.overlay(
    badge(bravo, { isCommunity: true }),
    // Newest first is then: Alpha, Delta, Bravo, Charlie.
    badge(charlie, { createdAt: String(now + 1) }),
    badge(bravo, { createdAt: String(now + 2) }),
    badge(delta, { createdAt: String(now + 3) }),
    badge(alpha, { createdAt: String(now + 4) }),
  );

  const id = (value: bigint) => value.toString();
  return {
    word,
    creator,
    other,
    charlie: id(charlie),
    alpha: id(alpha),
    bravo: id(bravo),
    delta: id(delta),
  };
}

const sorted = (ids: string[]) => [...ids].sort();

test.describe("badges list", () => {
  test(
    "G1: /badges shows the introduction, the grid of official badges, the FAQ link and Create Badge",
    { tag: ["@smoke"] },
    async ({ actor, page, chain, s3, subgraph, nextAccount }) => {
      // The page opens on official badges, and the fork has none: make one.
      const creator = await actor("officialBadgeCreator");
      const name = `E2E Official ${nextAccount().address.slice(2, 10).toLowerCase()}`;
      const { uri } = await s3.putJson({ name, description: "An official badge made for one browser test." });
      const badgeId = await chain.createBadge({ creator: creator.address, name, uri, isOfficial: true });
      await subgraph.sync();

      const list = new BadgesListPage(page);
      await list.open();

      await expect(list.intro).toBeVisible();
      await expect(page.getByText(/Verifiable credentials of role, status and membership across Society\s+Protocol/)).toBeVisible();
      await expect(list.tab("All")).toHaveAttribute("aria-selected", "true");
      await expect(list.categoryToggle("Official")).toHaveAttribute("aria-pressed", "true");
      await expect(list.categoryToggle("Community")).toHaveAttribute("aria-pressed", "false");
      await expect(list.categoryToggle("Individual")).toHaveAttribute("aria-pressed", "false");

      // The new badge's card: id, category, name, creator and metadata.
      const card = list.card(badgeId);
      await expect(card).toBeVisible();
      await expect(card.getByText(`ID: #${badgeId}`, { exact: true })).toBeVisible();
      await expect(card.getByText("OFFICIAL", { exact: true })).toBeVisible();
      await expect(card.getByTitle(name, { exact: true })).toHaveText(name);
      // The picture and the name both lead to the badge.
      const toBadge = card.getByRole("link", { name, exact: true });
      await expect(toBadge).toHaveCount(2);
      await expect(toBadge.first()).toHaveAttribute("href", `/badges/${badgeId}`);
      await expect(toBadge.last()).toHaveAttribute("href", `/badges/${badgeId}`);
      await expect(card).toContainText("CREATED BY");
      await expect(card).toContainText(creator.profile!.name);
      await expect(card.getByRole("link", { name: "View Metadata" })).toHaveAttribute("href", uri);

      // The grid holds the official badges and nothing else.
      const official = (await subgraph.entities("Badge"))
        .filter((entity) => entity.isOfficial && !entity.isProfile)
        .map((entity) => entity.id);
      expect(official.length).toBeLessThan(1000);
      await expect.poll(async () => sorted(await list.ids())).toEqual(sorted(official));
      await expect(list.emptyMessage).toHaveCount(0);

      // "Create Badge" opens the wizard; the FAQ link opens the FAQ.
      await expect(list.faqLink).toHaveAttribute("href", "/badges-faq");
      await list.createBadgeButton.click();
      await expect(page).toHaveURL(/\/create-badge$/);
      await page.goBack();
      await list.faqLink.click();
      await expect(page).toHaveURL(/\/badges-faq$/);
      await expect(page.getByRole("heading", { level: 1, name: "Badges FAQ" })).toBeVisible();
      await expect(page.getByText("What is a Badge?")).toBeVisible();
    },
  );

  test(
    "G2: logged out, only the All tab can be used",
    { tag: ["@core"] },
    async ({ page }) => {
      const list = new BadgesListPage(page);
      await list.open(`?${ALL_CATEGORIES}`);
      await expect(list.cards.first()).toBeVisible();

      await expect(list.tab("All")).toHaveAttribute("aria-selected", "true");
      await expect(list.tab("All")).toBeEnabled();
      await expect(list.tab("Managed by me")).toBeDisabled();
      await expect(list.tab("My badges")).toBeDisabled();
      expect(list.param("tab")).toBeNull();
    },
  );

  test(
    "G2: a member's tabs show the badges they manage and the badges they hold",
    { tag: ["@core"] },
    async ({ persona, actor, page, pages, chain, subgraph, wallet }) => {
      // I manage `managed` (I made it) and hold none of it; I hold one of
      // `held`, which somebody else made and manages.
      const [me, issuer] = await Promise.all([persona("badgeMinter"), actor("badgeMinter")]);
      const managed = me.badge!.id.toString();
      const held = issuer.badge!.id.toString();
      await chain.writeBadgesAs(issuer.address, "mint", [me.address, issuer.badge!.id, BigInt(1), "0x"]);
      await subgraph.sync();
      expect(await chain.badgeBalance(me.address, issuer.badge!.id)).toBe(BigInt(1));
      expect(await chain.badgeBalance(me.address, me.badge!.id)).toBe(BigInt(0));

      const list = new BadgesListPage(page);
      await list.open(`?${ALL_CATEGORIES}`);
      await expect(list.tab("Managed by me")).toBeDisabled();
      await pages.shell.connect();
      await expect(list.tab("Managed by me")).toBeEnabled();
      await expect(list.tab("My badges")).toBeEnabled();

      // All: both are there, among everybody else's.
      await expect(list.card(managed)).toBeVisible();
      await expect(list.card(held)).toBeVisible();

      await list.tab("Managed by me").click();
      await expect(list.tab("Managed by me")).toHaveAttribute("aria-selected", "true");
      await expect.poll(() => list.ids()).toEqual([managed]);
      await expect(list.card(managed)).toContainText(me.badge!.name);
      expect(list.param("tab")).toBe("managed-by-me");

      await list.tab("My badges").click();
      await expect(list.tab("My badges")).toHaveAttribute("aria-selected", "true");
      await expect.poll(() => list.ids()).toEqual([held]);
      await expect(list.card(held)).toContainText(issuer.badge!.name);
      expect(list.param("tab")).toBe("my-badges");

      // The tab is part of the address: it survives a reload.
      await page.reload();
      await expect(pages.shell.accountButton).toBeVisible();
      await expect(list.tab("My badges")).toHaveAttribute("aria-selected", "true");
      await expect.poll(() => list.ids()).toEqual([held]);

      await list.tab("All").click();
      await expect(list.card(managed)).toBeVisible();
      await expect(list.card(held)).toBeVisible();
      await expect.poll(() => list.param("tab")).toBeNull();

      // Browsing asks the wallet for nothing but the connection.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "G3: search narrows the list by name, and the category toggles choose which kinds are shown",
    { tag: ["@core"] },
    async ({ actor, page, chain, s3, subgraph, nextAccount }) => {
      const seed = await seedCatalog({ actor, chain, s3, subgraph, nextAccount });
      const list = new BadgesListPage(page);
      await list.open();

      // Official only, as the page opens: of the four, only Charlie.
      await list.searchInput.fill(seed.word);
      await expect.poll(() => list.ids()).toEqual([seed.charlie]);
      await expect.poll(() => list.param("search")).toBe(seed.word);
      await expect(list.card(seed.charlie).getByText("OFFICIAL", { exact: true })).toBeVisible();
      expect(list.param("category")).toBeNull();

      await list.categoryToggle("Community").click();
      await expect(list.categoryToggle("Community")).toHaveAttribute("aria-pressed", "true");
      await expect.poll(async () => sorted(await list.ids())).toEqual(sorted([seed.charlie, seed.bravo]));
      await expect(list.card(seed.bravo).getByText("COMMUNITY", { exact: true })).toBeVisible();
      await expect.poll(() => list.param("category")).toBe("official,community");

      await list.categoryToggle("Individual").click();
      await expect
        .poll(async () => sorted(await list.ids()))
        .toEqual(sorted([seed.charlie, seed.bravo, seed.alpha, seed.delta]));
      await expect(list.card(seed.alpha).getByText("INDIVIDUAL", { exact: true })).toBeVisible();
      await expect.poll(() => list.param("category")).toBe("official,community,individual");

      await list.categoryToggle("Official").click();
      await expect(list.categoryToggle("Official")).toHaveAttribute("aria-pressed", "false");
      await expect
        .poll(async () => sorted(await list.ids()))
        .toEqual(sorted([seed.bravo, seed.alpha, seed.delta]));

      await list.categoryToggle("Community").click();
      await expect.poll(async () => sorted(await list.ids())).toEqual(sorted([seed.alpha, seed.delta]));
      await expect.poll(() => list.param("category")).toBe("individual");

      // No category at all: nothing to show.
      await list.categoryToggle("Individual").click();
      await expect(list.emptyMessage).toBeVisible();
      await expect(list.cards).toHaveCount(0);

      // The search also finds badges by their creator's address: the one
      // badge the other member made, whose name does not hold the address.
      await list.categoryToggle("Individual").click();
      await expect.poll(async () => sorted(await list.ids())).toEqual(sorted([seed.alpha, seed.delta]));
      await list.searchInput.fill(seed.other.address);
      await expect.poll(() => list.ids()).toEqual([seed.delta]);

      // Clearing the search takes it out of the address too.
      await list.clearSearchButton.click();
      await expect(list.searchInput).toHaveValue("");
      await expect.poll(() => list.param("search")).toBeNull();
      await expect(list.card(seed.alpha)).toBeVisible();
    },
  );

  test(
    "G3: the list can be sorted by name, holders, id and age",
    { tag: ["@core"] },
    async ({ actor, page, chain, s3, subgraph, nextAccount }) => {
      const seed = await seedCatalog({ actor, chain, s3, subgraph, nextAccount });
      const all = sorted([seed.charlie, seed.alpha, seed.bravo, seed.delta]);
      const list = new BadgesListPage(page);
      await list.open(`?${ALL_CATEGORIES}&search=${seed.word}`);

      // As opened: newest first.
      await expect(list.sortSelect).toHaveText("Newest");
      await expect.poll(() => list.ids()).toEqual([seed.alpha, seed.delta, seed.bravo, seed.charlie]);
      expect(list.param("orderBy")).toBeNull();

      await list.chooseSort("Name");
      await expect.poll(() => list.ids()).toEqual([seed.alpha, seed.bravo, seed.charlie, seed.delta]);
      await expect.poll(() => list.param("orderBy")).toBe("name");

      // Most holders first: Bravo has two, Charlie one, the others none.
      await list.chooseSort("Holders");
      await expect.poll(async () => (await list.ids()).slice(0, 2)).toEqual([seed.bravo, seed.charlie]);
      expect(sorted(await list.ids())).toEqual(all);
      await expect.poll(() => list.param("orderBy")).toBe("holdersCount");

      // Highest id first. The subgraph compares ids as text, which is the
      // numeric order as long as the four have the same number of digits.
      await list.chooseSort("ID");
      await expect.poll(() => list.param("orderBy")).toBe("id");
      if (new Set(all.map((id) => id.length)).size === 1) {
        await expect.poll(() => list.ids()).toEqual([seed.delta, seed.bravo, seed.alpha, seed.charlie]);
      } else {
        await expect.poll(async () => sorted(await list.ids())).toEqual(all);
      }

      await list.chooseSort("Newest");
      await expect.poll(() => list.ids()).toEqual([seed.alpha, seed.delta, seed.bravo, seed.charlie]);
      await expect.poll(() => list.param("orderBy")).toBeNull();
    },
  );

  test(
    "G3: Created by an address narrows the list, and every filter is kept in the address of the page",
    { tag: ["@core"] },
    async ({ actor, page, chain, s3, subgraph, nextAccount }) => {
      const seed = await seedCatalog({ actor, chain, s3, subgraph, nextAccount });
      const everyone = sorted([seed.charlie, seed.alpha, seed.bravo, seed.delta]);
      const byCreator = sorted([seed.charlie, seed.alpha, seed.bravo]);
      const creatorAddress = seed.creator.address.toLowerCase();
      const list = new BadgesListPage(page);
      await list.open(`?${ALL_CATEGORIES}&search=${seed.word}`);
      await expect.poll(async () => sorted(await list.ids())).toEqual(everyone);
      await expect(list.createdBySelect).toHaveText("Anyone");
      await expect(list.createdByAddressInput).toHaveCount(0);

      // "Address" opens a field; the whole address is put in at once, as a
      // paste does (key by key: see the next test).
      await list.chooseCreatedBy("Address");
      await expect.poll(() => list.param("createdBy")).toBe("address");
      await list.createdByAddressInput.fill(creatorAddress);
      await expect.poll(async () => sorted(await list.ids())).toEqual(byCreator);
      await expect.poll(() => list.param("createdByAddress")).toBe(creatorAddress);

      await list.chooseSort("Name");
      await expect.poll(() => list.ids()).toEqual([seed.alpha, seed.bravo, seed.charlie]);
      // The order by name is the same as the newest first here, so wait for
      // the address itself: the app writes it a moment after the list.
      await expect.poll(() => list.param("orderBy")).toBe("name");

      // Everything chosen so far is in the address: a reload shows the same.
      await page.reload();
      await expect(list.searchInput).toHaveValue(seed.word);
      await expect(list.categoryToggle("Official")).toHaveAttribute("aria-pressed", "true");
      await expect(list.categoryToggle("Community")).toHaveAttribute("aria-pressed", "true");
      await expect(list.categoryToggle("Individual")).toHaveAttribute("aria-pressed", "true");
      await expect(list.sortSelect).toHaveText("Name");
      await expect(list.createdBySelect).toHaveText("Address");
      await expect(list.createdByAddressInput).toHaveValue(creatorAddress);
      await expect.poll(() => list.ids()).toEqual([seed.alpha, seed.bravo, seed.charlie]);

      // And so does the same address opened anew, with the filters in another order.
      await list.open(
        `?orderBy=name&createdByAddress=${creatorAddress}&createdBy=address&search=${seed.word}&${ALL_CATEGORIES}`,
      );
      await expect.poll(() => list.ids()).toEqual([seed.alpha, seed.bravo, seed.charlie]);

      // Back to "Anyone": the address goes with it.
      await list.chooseCreatedBy("Anyone");
      await expect(list.createdByAddressInput).toHaveCount(0);
      await expect.poll(async () => sorted(await list.ids())).toEqual(everyone);
      await expect.poll(() => list.param("createdBy")).toBeNull();
      await expect.poll(() => list.param("createdByAddress")).toBeNull();
    },
  );

  test(
    "G3: Created by Me shows the badges the connected member made",
    { tag: ["@core"] },
    async ({ persona, page, pages }) => {
      const me = await persona("badgeMinter");
      const list = new BadgesListPage(page);
      await list.open("?category=individual");
      await pages.shell.connect();

      await list.chooseCreatedBy("Me");
      await expect.poll(() => list.param("createdBy")).toBe("me");
      // The member made one badge; their profile badge is not listed.
      await expect.poll(() => list.ids()).toEqual([me.badge!.id.toString()]);
      await expect(list.createdByAddressInput).toHaveCount(0);
    },
  );

  test(
    "G3: an address can be typed into Created by, key by key",
    { tag: ["@core"] },
    async ({ actor, page }) => {
      const creator = await actor("badgeMinter");
      const creatorAddress = creator.address.toLowerCase();
      const list = new BadgesListPage(page);
      await list.open("?category=individual");
      await list.chooseCreatedBy("Address");
      await expect(list.createdByAddressInput).toBeVisible();
      await list.createdByAddressInput.pressSequentially(creatorAddress);

      // APP BUG, expected to fail until it is fixed: the field cannot be
      // typed into. Badges.onCreatedByAddressChange keeps a value only when
      // it is a complete address and stores null otherwise, and the field
      // shows what is stored: after each key the text is not an address
      // yet, null is stored, and the key is gone. Only a paste of a whole
      // address gets through (previous tests). Everything above this line
      // must pass; only the assertions below are expected to fail.
      test.fail(true, "the Created by address field drops every key until the text is a complete address (Badges.tsx)");
      // Short on purpose: a fixed app has the typed text in the field
      // already. Remove these timeouts together with test.fail.
      await expect(list.createdByAddressInput).toHaveValue(creatorAddress, { timeout: 2_000 });
      await expect.poll(() => list.ids(), { timeout: 5_000 }).toEqual([creator.badge!.id.toString()]);
    },
  );

  test(
    "G4: a search that matches nothing says so, and the list comes back when it is cleared",
    { tag: ["@edge"] },
    async ({ page, nextAccount }) => {
      const nothing = `nothing-${nextAccount().address.slice(2, 14).toLowerCase()}`;
      const list = new BadgesListPage(page);
      await list.open(`?${ALL_CATEGORIES}&search=${nothing}`);

      await expect(list.emptyMessage).toBeVisible();
      await expect(list.cards).toHaveCount(0);
      await expect(list.errorTitle).toHaveCount(0);

      await list.clearSearchButton.click();
      await expect(list.cards.first()).toBeVisible();
      await expect(list.emptyMessage).toHaveCount(0);
    },
  );

  test(
    "G4: when the list cannot be loaded the page says so, and Retry loads it",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      // A fault fails one request unless it is given a count; the page asks again by itself.
      await subgraph.injectFaults({ kind: "http-error", operation: "Badges", count: 100 });
      const list = new BadgesListPage(page);
      await list.open(`?${ALL_CATEGORIES}`);

      // The page tries a few times by itself first.
      await expect(list.errorTitle).toBeVisible({ timeout: 60_000 });
      await expect(list.retryButton).toBeVisible();
      await expect(list.cards).toHaveCount(0);
      await expect(list.emptyMessage).toHaveCount(0);
      // The rest of the page is still there.
      await expect(list.intro).toBeVisible();
      await expect(list.searchInput).toBeVisible();
      const failed = (await subgraph.requests()).filter((request) => request.operationName === "Badges");
      expect(failed.length).toBeGreaterThan(0);

      // The subgraph is back: Retry loads the list.
      await subgraph.clearFaults();
      await list.retryButton.click();
      await expect(list.cards.first()).toBeVisible();
      await expect(list.errorTitle).toHaveCount(0);
    },
  );

  test(
    "G4: the list loads a thousand badges at a time, the next ones when the end comes into view",
    { tag: ["@edge"] },
    async ({ page, subgraph, nextAccount }) => {
      // 1005 badges that only the subgraph knows: five more than one page.
      const prefix = `e2escroll${nextAccount().address.slice(2, 10).toLowerCase()}`;
      const firstId = BigInt(10) ** BigInt(12);
      await subgraph.overlay(
        manyBadges({ count: 1005, namePrefix: prefix, createdBy: nextAccount().address, firstId }),
      );
      const newest = (firstId + BigInt(1004)).toString();
      const oldest = firstId.toString();

      const list = new BadgesListPage(page);
      await list.open(`?category=individual&search=${prefix}`);

      // The first page: the thousand newest.
      await expect(list.cards).toHaveCount(1000);
      await expect(list.cards.first()).toHaveAttribute("data-badge-id", newest);
      await expect(list.card(oldest)).toHaveCount(0);

      // Scrolling to the end fetches the rest.
      await list.cards.last().scrollIntoViewIfNeeded();
      await expect(list.cards).toHaveCount(1005);
      await expect(list.cards.last()).toHaveAttribute("data-badge-id", oldest);
      await expect(list.loadingMore).toHaveCount(0);

      // Two requests for this search: the first thousand, then from 1000 on.
      const fetched = (await subgraph.requests())
        .filter((request) => request.operationName === "Badges" && JSON.stringify(request.variables).includes(prefix))
        .map((request) => [request.variables.first, request.variables.skip]);
      expect(fetched).toEqual([
        [1000, 0],
        [1000, 1000],
      ]);
    },
  );
});
