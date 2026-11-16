import { expect, test } from "../../fixtures";
import { listedCommunity, nowInSeconds } from "../../support/builders/communities-entities";
import { link } from "../../support/builders/entities";
import { CommunitiesPage, SORT_PARAM } from "../../support/pages/communities";
import { CommunityDetailPage } from "../../support/pages/community-detail";

/**
 * /communities: the list.
 *
 * The subgraph fake has no communities of its own (it does not follow the
 * CommunityRegistry, and the baseline holds none), so every community here
 * is an overlay, gone again after the test. The tests still only speak
 * about the communities they made: a card is looked up by its id, and an
 * order is compared among the test's own cards.
 */

const DAY = 24 * 60 * 60;

/** The ids among `shown` that the test made, in the order shown. */
const only = (mine: number[], shown: string[]) => shown.filter((id) => mine.includes(Number(id)));

test.describe("communities: the list", () => {
  test(
    "J1: /communities shows the communities as cards, with the FAQ link and Create Community",
    { tag: ["@smoke"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      await subgraph.overlay(
        listedCommunity({ id: 9_000_101, name: "E2E Gold Guild", tier: "gold", memberCount: 12 }),
        listedCommunity({ id: 9_000_102, name: "E2E Silver Circle", tier: "silver", memberCount: 1 }),
      );

      await list.open();
      await expect(list.heading).toBeVisible();
      await expect(list.faqLink).toHaveAttribute("href", "/communities-faq");
      await expect(list.createLink).toHaveAttribute("href", "/create-community");

      // Nobody is connected: the list of everyone's communities, and no "My Communities".
      await expect(list.allTab).toHaveAttribute("aria-selected", "true");
      await expect(list.myTab).toBeDisabled();
      await expect(list.managedOnlySwitch).toHaveCount(0);

      // A card: the id, the COMMUNITY label, the name, the member count and the tier.
      const gold = list.card(9_000_101);
      await expect(gold).toBeVisible();
      await expect(list.skeletons).toHaveCount(0);
      await expect(gold).toContainText("ID: #9000101");
      await expect(gold.getByText("COMMUNITY", { exact: true })).toBeVisible();
      await expect(gold).toContainText("12 Members");
      await expect(list.cardTier(gold)).toHaveText("Gold");

      const silver = list.card(9_000_102);
      await expect(silver).toContainText("E2E Silver Circle");
      await expect(silver).toContainText("1 Members");
      await expect(list.cardTier(silver)).toHaveText("Silver");

      // The name leads to the community's page. (The picture is a link with
      // the same accessible name; the name's link is the one with the text.)
      const nameLink = gold.getByRole("link", { name: "E2E Gold Guild" }).filter({ hasText: "E2E Gold Guild" });
      await expect(nameLink).toHaveAttribute("href", "/communities/9000101");
      await nameLink.click();
      await expect(page).toHaveURL(/\/communities\/9000101$/);
      await expect(new CommunityDetailPage(page).name("E2E Gold Guild")).toBeVisible();
    },
  );

  test(
    "J2: My Communities lists the communities the member belongs to, and the switch narrows it to the ones the member manages",
    { tag: ["@core"] },
    async ({ page, persona, pages, subgraph }) => {
      const list = new CommunitiesPage(page);
      const me = await persona("member");
      const [managed, joined, foreign, fromWallet] = [9_000_201, 9_000_202, 9_000_203, 9_000_204];
      await subgraph.overlay(
        // Managed by the member's Society address, which is also a member of it.
        listedCommunity({ id: managed, name: "J2 Mine To Manage", manager: me.address, tier: "gold", memberCount: 1 }),
        // The member belongs to it; somebody else manages it.
        listedCommunity({ id: joined, name: "J2 Just A Member", tier: "silver", memberCount: 2 }),
        // Nothing to do with the member.
        listedCommunity({ id: foreign, name: "J2 Somebody Else's", tier: "bronze", memberCount: 3 }),
        // Managed by the member's wallet, as a community made before the
        // move to Society addresses is. The member is not a member of it.
        listedCommunity({ id: fromWallet, name: "J2 From My Wallet", manager: me.ownerAddress, tier: "gold" }),
        link("User", me.address, "communities", [String(managed), String(joined)]),
      );

      await list.open();
      await pages.shell.connect();

      // All Communities: every one of them, whoever they belong to.
      for (const id of [managed, joined, foreign, fromWallet]) await expect(list.card(id)).toBeVisible();
      await expect(list.myTab).toBeEnabled();

      // My Communities: the two the member is a member of.
      await list.myTab.click();
      await expect(list.myTab).toHaveAttribute("aria-selected", "true");
      await expect(page).toHaveURL(/[?&]tab=my-communities(&|$)/);
      await expect(list.card(foreign)).toHaveCount(0);
      await expect(list.card(fromWallet)).toHaveCount(0);
      await expect(list.card(managed)).toBeVisible();
      await expect(list.card(joined)).toBeVisible();
      await expect(list.managedOnlySwitch).not.toBeChecked();

      // "Only communities that I manage": the ones managed by the Society
      // address or by the wallet behind it.
      await list.managedOnlySwitch.check();
      await expect(page).toHaveURL(/[?&]managed=true(&|$)/);
      await expect(list.card(joined)).toHaveCount(0);
      await expect(list.card(foreign)).toHaveCount(0);
      await expect(list.card(managed)).toBeVisible();
      await expect(list.card(fromWallet)).toBeVisible();

      // Back to All: the switch is gone and its choice forgotten.
      await list.allTab.click();
      await expect(list.managedOnlySwitch).toHaveCount(0);
      for (const id of [managed, joined, foreign, fromWallet]) await expect(list.card(id)).toBeVisible();
      await list.myTab.click();
      await expect(list.managedOnlySwitch).not.toBeChecked();
      await expect(list.card(joined)).toBeVisible();
    },
  );

  test(
    "J3: the search finds communities by a part of their name, in any case, or by their id",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      const [alpha, beta, lighthouse] = [9_000_301, 9_000_302, 9_000_303];
      await subgraph.overlay(
        listedCommunity({ id: alpha, name: "J3 Quorum Alpha", tier: "gold" }),
        listedCommunity({ id: beta, name: "J3 Quorum Beta", tier: "silver" }),
        listedCommunity({ id: lighthouse, name: "J3 Lighthouse", tier: "bronze" }),
      );

      await list.open();
      for (const id of [alpha, beta, lighthouse]) await expect(list.card(id)).toBeVisible();

      // A part of the name, typed in another case. The URL carries the search.
      await list.search("j3 quorum");
      await expect(list.card(lighthouse)).toHaveCount(0);
      await expect(list.card(alpha)).toBeVisible();
      await expect(list.card(beta)).toBeVisible();
      await expect(page).toHaveURL(/[?&]search=j3(\+|%20)quorum(&|$)/);

      // The cross empties the box and brings everything back.
      await list.clearSearchButton.click();
      await expect(list.searchInput).toHaveValue("");
      await expect(list.card(lighthouse)).toBeVisible();
      await expect(list.clearSearchButton).toHaveCount(0);

      // The id, exactly.
      await list.search(String(lighthouse));
      await expect(list.card(alpha)).toHaveCount(0);
      await expect(list.card(beta)).toHaveCount(0);
      await expect(list.card(lighthouse)).toBeVisible();

      // Nothing matches.
      await list.search("j3 no such community");
      await expect(list.emptyState).toBeVisible();
      await expect(list.cards).toHaveCount(0);
    },
  );

  test(
    "J3: the tier filter starts with gold, silver and bronze, and a tier that has run out counts as unaffiliated",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      const [gold, silver, bronze, unaffiliated, lapsed] = [9_000_311, 9_000_312, 9_000_313, 9_000_314, 9_000_315];
      await subgraph.overlay(
        listedCommunity({ id: gold, name: "J3 Tier Gold", tier: "gold" }),
        listedCommunity({ id: silver, name: "J3 Tier Silver", tier: "silver" }),
        listedCommunity({ id: bronze, name: "J3 Tier Bronze", tier: "bronze" }),
        listedCommunity({ id: unaffiliated, name: "J3 Tier None", tier: "unaffiliated" }),
        // Gold in the subgraph, but the tier ran out yesterday.
        listedCommunity({ id: lapsed, name: "J3 Tier Lapsed", tier: "gold", tierExpiresAt: nowInSeconds() - DAY }),
      );

      await list.open();
      await expect(list.tierButton("Gold")).toHaveAttribute("aria-pressed", "true");
      await expect(list.tierButton("Silver")).toHaveAttribute("aria-pressed", "true");
      await expect(list.tierButton("Bronze")).toHaveAttribute("aria-pressed", "true");
      await expect(list.tierButton("Unaffiliated")).toHaveAttribute("aria-pressed", "false");
      for (const id of [gold, silver, bronze]) await expect(list.card(id)).toBeVisible();
      await expect(list.card(unaffiliated)).toHaveCount(0);
      await expect(list.card(lapsed)).toHaveCount(0);

      // Gold only.
      await list.setTier("Silver", false);
      await list.setTier("Bronze", false);
      await expect(list.card(silver)).toHaveCount(0);
      await expect(list.card(bronze)).toHaveCount(0);
      await expect(list.card(gold)).toBeVisible();
      await expect.poll(() => list.urlParam("tier")).toBe("gold");

      // Gold and unaffiliated: the lapsed gold community is among the unaffiliated.
      await list.setTier("Unaffiliated", true);
      await expect(list.card(unaffiliated)).toBeVisible();
      await expect(list.card(lapsed)).toBeVisible();
      await expect(list.card(gold)).toBeVisible();
      await expect(list.card(silver)).toHaveCount(0);
      await expect(list.cardTier(list.card(unaffiliated))).toHaveText("Unaffiliated");
      await expect(list.cardTier(list.card(lapsed))).toHaveText("Unaffiliated");
      await expect(list.cardTier(list.card(gold))).toHaveText("Gold");

      // Unaffiliated only: the community whose gold is still running is out.
      await list.setTier("Gold", false);
      await expect(list.card(gold)).toHaveCount(0);
      await expect(list.card(unaffiliated)).toBeVisible();
      await expect(list.card(lapsed)).toBeVisible();

      // All four: everything.
      await list.setTier("Gold", true);
      await list.setTier("Silver", true);
      await list.setTier("Bronze", true);
      for (const id of [gold, silver, bronze, unaffiliated, lapsed]) await expect(list.card(id)).toBeVisible();
    },
  );

  test(
    "J3: an empty result offers the unaffiliated communities the filter left out, and Show unaffiliated adds them",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      const driftwood = 9_000_321;
      await subgraph.overlay(listedCommunity({ id: driftwood, name: "J3 Driftwood", tier: "unaffiliated" }));

      // Found by the search, hidden by the default tier filter.
      await list.open();
      await list.search("J3 Driftwood");
      await expect(list.emptyState).toBeVisible();
      await expect(list.unaffiliatedHint).toBeVisible();
      await expect(list.card(driftwood)).toHaveCount(0);

      await list.showUnaffiliatedButton.click();
      await expect(list.tierButton("Unaffiliated")).toHaveAttribute("aria-pressed", "true");
      await expect(list.tierButton("Gold")).toHaveAttribute("aria-pressed", "true");
      await expect(list.card(driftwood)).toBeVisible();
      await expect(list.cardTier(list.card(driftwood))).toHaveText("Unaffiliated");
      await expect(list.emptyState).toHaveCount(0);
      await expect(list.showUnaffiliatedButton).toHaveCount(0);
    },
  );

  test(
    "J3: the list is sorted by tier, and can be sorted by name, by age and by member count",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      const now = nowInSeconds();
      const [delta, alpha, charlie, echo] = [9_000_331, 9_000_332, 9_000_333, 9_000_334];
      const mine = [delta, alpha, charlie, echo];
      await subgraph.overlay(
        listedCommunity({ id: delta, name: "J3 Delta", tier: "gold", createdAt: now - 4 * DAY, memberCount: 50 }),
        listedCommunity({ id: alpha, name: "J3 Alpha", tier: "silver", createdAt: now - 3 * DAY, memberCount: 5 }),
        listedCommunity({ id: charlie, name: "J3 Charlie", tier: "bronze", createdAt: now - 1 * DAY, memberCount: 20 }),
        // The highest tier id of all, but it ran out: only listed with the unaffiliated.
        listedCommunity({
          id: echo,
          name: "J3 Echo",
          tier: "gold",
          tierExpiresAt: now - DAY,
          createdAt: now - 2 * DAY,
          memberCount: 30,
        }),
      );
      const shown = async () => only(mine, await list.ids());

      // By tier, best first: that is the default.
      await list.open();
      await expect(list.sortSelect).toHaveText("Tier");
      await expect.poll(shown).toEqual([delta, alpha, charlie].map(String));

      // With the unaffiliated: a tier that ran out sorts last, whatever it was.
      await list.setTier("Unaffiliated", true);
      await expect.poll(shown).toEqual([delta, alpha, charlie, echo].map(String));

      await list.sortBy("Alphabetical");
      await expect.poll(() => list.urlParam("orderBy")).toBe(SORT_PARAM.Alphabetical);
      await expect.poll(shown).toEqual([alpha, charlie, delta, echo].map(String));

      await list.sortBy("Newest");
      await expect.poll(() => list.urlParam("orderBy")).toBe(SORT_PARAM.Newest);
      await expect.poll(shown).toEqual([charlie, echo, alpha, delta].map(String));

      await list.sortBy("Members");
      await expect.poll(() => list.urlParam("orderBy")).toBe(SORT_PARAM.Members);
      await expect.poll(shown).toEqual([delta, echo, charlie, alpha].map(String));

      // The choice is in the URL: a reload keeps it.
      await page.reload();
      await expect(list.sortSelect).toHaveText("Members");
      await expect.poll(shown).toEqual([delta, echo, charlie, alpha].map(String));
    },
  );

  test(
    "J4: a member of no community sees an empty My Communities",
    { tag: ["@edge"] },
    async ({ page, persona, pages, subgraph }) => {
      const list = new CommunitiesPage(page);
      await persona("member");
      await subgraph.overlay(listedCommunity({ id: 9_000_401, name: "J4 Not Mine", tier: "gold" }));

      await list.open();
      await pages.shell.connect();
      await expect(list.card(9_000_401)).toBeVisible();
      await list.myTab.click();
      await expect(list.emptyState).toBeVisible();
      await expect(list.cards).toHaveCount(0);
    },
  );

  test(
    "J4: when the list cannot be loaded the page says so, and Retry loads it",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      const community = listedCommunity({ id: 9_000_411, name: "J4 Back Again", tier: "gold" });
      await subgraph.overlay(community);
      // More failures than the page will try: it gives up after a few attempts.
      await subgraph.injectFaults({ kind: "http-error", status: 500, operation: "Communities", count: 50 });

      await list.open();
      await expect(list.errorHeading).toBeVisible();
      await expect(list.retryButton).toBeVisible();
      await expect(list.cards).toHaveCount(0);
      await expect(list.emptyState).toHaveCount(0);
      // That the upstream's own words stay on the server is P6
      // (api/graphql-contract.api.spec.ts): this fault's answer is not JSON,
      // so the route has nothing of it to pass on in the first place.
      const failed = (await subgraph.requests()).filter((request) => request.operationName === "Communities");
      expect(failed.length, "the page asked more than once before giving up").toBeGreaterThan(1);

      // The subgraph is back: the fault ends, the overlay stays.
      await subgraph.clearFaults();
      await list.retryButton.click();
      await expect(list.card(9_000_411)).toBeVisible();
      await expect(list.errorHeading).toHaveCount(0);
    },
  );

  test(
    "J4: the list loads fifty communities at a time as the page is scrolled",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      const list = new CommunitiesPage(page);
      const total = 60;
      const ids = Array.from({ length: total }, (_, index) => 9_000_500 + index);
      await subgraph.overlay(
        ...ids.map((id, index) =>
          listedCommunity({ id, name: `J4 Scroll ${String(index + 1).padStart(2, "0")}`, tier: "gold" }),
        ),
      );

      // The search is taken from the URL, and keeps the list to these sixty.
      await list.open("?search=J4%20Scroll&orderBy=name");
      await expect(list.searchInput).toHaveValue("J4 Scroll");
      await expect(list.cards).toHaveCount(50);
      expect(await list.ids()).toEqual(ids.slice(0, 50).map(String));

      await list.scrollUntilLoaded(total);
      expect(await list.ids()).toEqual(ids.map(String));
      await expect(list.loadingMore).toHaveCount(0);

      // Two pages were asked for: the first fifty, then the rest.
      const pagesAsked = (await subgraph.requests())
        .filter((request) => request.operationName === "Communities" && request.variables.orderBy === "name")
        .map((request) => request.variables.skip);
      expect([...new Set(pagesAsked)]).toEqual([0, 50]);
    },
  );
});
