import { expect, test } from "../../fixtures";
import {
  FAR_FUTURE,
  directoryAddresses,
  directoryMember,
  legacyPairsByState,
} from "../../support/builders/accounts-directory";
import { user, type ProtocolRole } from "../../support/builders/entities";
import { watchGraphqlAnswers } from "../../support/graphql-limit";
import { AccountsPage, ROLE_PARAM, type AccountRoleFilter } from "../../support/pages/accounts-directory";
import { onlyShortAddress } from "../../support/pages/connect-wallet";

/**
 * /accounts: the directory of everyone with a profile. It needs no wallet.
 *
 * The list comes from the subgraph, fifty accounts at a time. Accounts
 * made for a test are subgraph overlays with a creation time in the far
 * future, so that they are among the first of the default "Newest" order
 * whatever else is on the chain.
 */

/**
 * Known app bug, several tests below: every card's avatar asks /api/graphql
 * for its own User (src/components/Avatar/Avatar.tsx:22, useUserQuery), so
 * one load of the directory is 2 + 50 requests, and the route allows a
 * visitor a burst of 60 that refills one a second
 * (src/app/api/graphql/route.ts). The next page, a reload, a new search,
 * sort or filter soon after is answered 429 "Too many GraphQL requests".
 * TanStack Query retries a failed query three times (after 1, 2 and 4
 * seconds), and each retry can take a token that refilled meanwhile, so
 * whether the grid then shows "Users data is unavailable" or, late, the
 * cards depends on timing: with few requests missing (F2, F3) the cards
 * sometimes arrive. So each of these tests also ends with what browsing the
 * directory should never meet: a request refused with 429
 * (`expectNoGraphqlRefused`). Where in a test the first 429 falls depends
 * on how many members the chain has (other tests add some), so `test.fail`
 * is put above the first step that can be the one, and every check after it
 * has a short timeout. Remove both when the bug is fixed.
 */
const RATE_LIMIT_BUG = "the directory's avatars use up the visitor's /api/graphql allowance, a burst of 60 that refills one a second (Avatar.tsx useUserQuery per card)";

/** Browsing the directory stays within the visitor's /api/graphql allowance (see RATE_LIMIT_BUG). */
function expectNoGraphqlRefused(answers: ReturnType<typeof watchGraphqlAnswers>) {
  expect(answers.refused(), "requests of the directory to /api/graphql refused with 429").toBe(0);
}

/** The page size of the directory (defaultOptions.pageSize in src/data/users/consts.ts). */
const PAGE_SIZE = 50;

/** The "Users" requests that fetched a page of the directory (not the lookup of migrated wallets). */
function pageRequests(requests: { operationName?: string; variables: Record<string, unknown> }[]) {
  return requests.filter((request) => request.operationName === "Users" && request.variables.first === PAGE_SIZE);
}

test.describe("accounts directory", () => {
  test(
    "F1: the directory lists accounts as cards, newest first, and loads the next fifty when scrolled to the end",
    { tag: ["@smoke"] },
    async ({ page, subgraph, nextAccount }) => {
      const accounts = new AccountsPage(page);
      const graphqlAnswers = watchGraphqlAnswers(page);

      // 110 more members than the chain has: more than two pages in any case,
      // so the end is reached more than once, whatever else is on the chain.
      const extra = Array.from({ length: 110 }, (_, index) => ({
        address: nextAccount().address.toLowerCase(),
        name: `Scroll ${String(index).padStart(3, "0")}`,
        bio: `Listed as number ${index}.`,
      }));
      await subgraph.overlay(
        ...extra.map((member, index) =>
          directoryMember({ ...member, profileBadgeId: 9_200_000 + index, createdAt: FAR_FUTURE + index }),
        ),
      );
      const listed = await directoryAddresses(subgraph);
      expect(listed.size).toBeGreaterThan(2 * PAGE_SIZE);
      const newest = extra.at(-1)!;

      await accounts.open();
      await accounts.loaded();

      // The first page: fifty cards, the newest account first, each once.
      await expect(accounts.cards).toHaveCount(PAGE_SIZE);
      const firstPage = await accounts.addresses();
      expect(new Set(firstPage).size).toBe(PAGE_SIZE);
      expect(firstPage.slice(0, 3)).toEqual([newest.address, extra[108].address, extra[107].address]);
      // A card shows the account's name and bio.
      await expect(accounts.card(newest.address)).toContainText("Scroll 109");
      await expect(accounts.card(newest.address)).toContainText("Listed as number 109.");

      // Scrolling to the end loads the rest, page by page, until every account is listed once.
      // Known app bug (see RATE_LIMIT_BUG): the third page is refused with
      // 429 and the grid shows the error instead of the cards.
      test.fail(true, RATE_LIMIT_BUG);
      await accounts.scrollUntilLoaded(listed.size, { timeout: 5_000 });
      const all = await accounts.addresses();
      expect(new Set(all).size).toBe(all.length);
      expect(new Set(all)).toEqual(listed);
      // The first page stayed where it was.
      expect(all.slice(0, PAGE_SIZE)).toEqual(firstPage);

      // The pages were asked for one after another, fifty at a time. (A last
      // page that is full is followed by one more, empty, request.)
      const skips = pageRequests(await subgraph.requests()).map((request) => request.variables.skip);
      expect(skips).toEqual(
        Array.from({ length: Math.floor(listed.size / PAGE_SIZE) + 1 }, (_, index) => index * PAGE_SIZE),
      );

      // A card is a link to the account's public profile.
      await accounts.card(newest.address).click({ timeout: 5_000 });
      await expect(page).toHaveURL(new RegExp(`/user/${newest.address}$`), { timeout: 5_000 });
      await expect(page.getByRole("heading", { name: "Scroll 109's Profile", exact: true })).toBeVisible({
        timeout: 5_000,
      });
      expectNoGraphqlRefused(graphqlAnswers);
    },
  );

  test(
    "F2: search finds an account by name or by its address, survives a reload, and can be cleared",
    { tag: ["@core"] },
    async ({ page, actor, nextAccount, subgraph }) => {
      const accounts = new AccountsPage(page);
      const graphqlAnswers = watchGraphqlAnswers(page);
      // A name nobody else has, also not a member left by an earlier attempt of this test.
      const salt = nextAccount().address.slice(2, 8).toLowerCase();
      const name = `Quokka ${salt}`;
      const someone = await actor("member", { name, bio: "Found by the search." });

      await accounts.open();
      await accounts.loaded();
      expect(await accounts.cards.count()).toBeGreaterThan(1);

      // By name, whatever the case. The address bar carries the search.
      const typed = `QUOKKA ${salt}`;
      await accounts.search(typed);
      await expect(accounts.cards).toHaveCount(1);
      await expect(accounts.card(someone.address)).toContainText(name);
      await expect(accounts.card(someone.address)).toContainText("Found by the search.");
      await expect.poll(() => accounts.urlParam("search")).toBe(typed);

      // A reload keeps the search and its result.
      await page.reload();
      await expect(accounts.searchInput).toHaveValue(typed);
      await expect(accounts.cards).toHaveCount(1);
      await expect(accounts.card(someone.address)).toBeVisible();

      // The cross empties the box and brings the whole list back: its first
      // page, with the new member among the cards (not an empty grid or the
      // error state, which "not one card" would also accept).
      const listed = await directoryAddresses(subgraph);
      await accounts.clearSearchButton.click();
      await expect(accounts.searchInput).toHaveValue("");
      await expect(accounts.clearSearchButton).toBeHidden();
      await expect(accounts.cards).toHaveCount(Math.min(PAGE_SIZE, listed.size));
      await expect(accounts.card(someone.address)).toBeVisible();
      await expect.poll(() => accounts.urlParam("search") ?? "").toBe("");

      // Known app bug (see RATE_LIMIT_BUG): the cards of the whole list
      // after the reload use up the minute's requests, and the next search
      // is refused.
      test.fail(true, RATE_LIMIT_BUG);
      const short = { timeout: 5_000 };

      // By a part of the name.
      await accounts.search(salt);
      await expect(accounts.cards).toHaveCount(1, short);
      await expect(accounts.card(someone.address)).toBeVisible(short);

      // By the Society address, pasted with its checksum.
      await accounts.search(someone.address);
      await expect.poll(() => accounts.urlParam("search"), short).toBe(someone.address);
      await expect(accounts.cards).toHaveCount(1, short);
      await expect(accounts.card(someone.address)).toContainText(name, short);

      // The profile is not on the owner wallet. Each "nobody" below follows
      // a search with one card on screen: the page keeps the last result up
      // until the next one is in, so an empty list after an empty list would
      // prove nothing.
      await accounts.search(someone.ownerAddress);
      await expect(accounts.emptyState).toBeVisible(short);
      await expect(accounts.cards).toHaveCount(0, short);

      // An address is matched as a whole.
      await accounts.search(someone.address);
      await expect(accounts.cards).toHaveCount(1, short);
      await expect(accounts.emptyState).toBeHidden(short);
      await accounts.search(someone.address.slice(0, 22));
      await expect(accounts.emptyState).toBeVisible(short);
      await expect(accounts.cards).toHaveCount(0, short);
      expectNoGraphqlRefused(graphqlAnswers);
    },
  );

  test(
    "F3: the list is sorted by Newest first, or by Name, and the choice is kept in the address",
    { tag: ["@core"] },
    async ({ page, subgraph, nextAccount }) => {
      const accounts = new AccountsPage(page);
      const graphqlAnswers = watchGraphqlAnswers(page);
      // Three members whose order by name differs from their order by age.
      // Their names sort before everyone else's.
      const salt = nextAccount().address.slice(2, 8).toLowerCase();
      const [alpha, bravo, charlie] = [nextAccount(), nextAccount(), nextAccount()].map((account) =>
        account.address.toLowerCase(),
      );
      const sortable = (address: string, id: number, name: string, age: number) =>
        directoryMember({
          address,
          profileBadgeId: id,
          name: `000 ${name} ${salt}`,
          createdAt: FAR_FUTURE + age,
          sortName: true,
        });
      await subgraph.overlay(
        sortable(alpha, 9_300_001, "Alpha", 1),
        sortable(bravo, 9_300_002, "Bravo", 3),
        sortable(charlie, 9_300_003, "Charlie", 2),
      );
      const mine = [alpha, bravo, charlie];
      const orderOfMine = async () => (await accounts.addresses()).filter((address) => mine.includes(address));

      // Default: Newest. The three are the newest of all.
      await accounts.open();
      await accounts.loaded();
      await expect(accounts.sortSelect).toHaveText("Newest");
      await expect.poll(async () => (await accounts.addresses()).slice(0, 3)).toEqual([bravo, charlie, alpha]);

      // By name, ascending.
      await accounts.sortBy("Name");
      await expect.poll(orderOfMine).toEqual([alpha, bravo, charlie]);
      await expect.poll(() => accounts.urlParam("orderBy")).toBe("name");
      const byName = pageRequests(await subgraph.requests()).at(-1)!;
      expect(byName.variables).toMatchObject({ orderBy: "name", orderDirection: "asc", skip: 0 });

      // Known app bug (see RATE_LIMIT_BUG): with more than a page of members
      // the reload is refused, with fewer the sort after it.
      test.fail(true, RATE_LIMIT_BUG);
      const short = { timeout: 5_000 };

      // The choice is in the address: a reload keeps it.
      await page.reload();
      await expect(accounts.sortSelect).toHaveText("Name", short);
      await expect.poll(orderOfMine, short).toEqual([alpha, bravo, charlie]);

      // And back.
      await accounts.sortBy("Newest");
      await expect.poll(async () => (await accounts.addresses()).slice(0, 3), short).toEqual([bravo, charlie, alpha]);
      const byAge = pageRequests(await subgraph.requests()).at(-1)!;
      expect(byAge.variables).toMatchObject({ orderBy: "profile__createdAt", orderDirection: "desc", skip: 0 });
      expectNoGraphqlRefused(graphqlAnswers);
    },
  );

  test(
    "F4: the role filter shows the accounts with any of the chosen roles",
    { tag: ["@core"] },
    async ({ page, subgraph, nextAccount }) => {
      const accounts = new AccountsPage(page);
      const graphqlAnswers = watchGraphqlAnswers(page);
      // One member per role, one without a role and one with two.
      const roles: Record<string, ProtocolRole[]> = {
        governor: ["GOVERNOR"],
        contributor: ["CONTRIBUTOR"],
        coreTeam: ["CORE_TEAM"],
        advisor: ["ADVISOR"],
        moderator: ["MODERATOR"],
        basic: [],
        governorAndModerator: ["GOVERNOR", "MODERATOR"],
      };
      const keys = Object.keys(roles);
      const addressOf = new Map(keys.map((key) => [key, nextAccount().address.toLowerCase()]));
      await subgraph.overlay(
        ...keys.map((key, index) =>
          directoryMember({
            address: addressOf.get(key)!,
            profileBadgeId: 9_400_000 + index,
            name: `Role ${key}`,
            createdAt: FAR_FUTURE + index,
            roles: roles[key],
          }),
        ),
      );
      /** Which of the seven are listed, in the order of `keys`. */
      const shown = async () => {
        const addresses = await accounts.addresses();
        return keys.filter((key) => addresses.includes(addressOf.get(key)!));
      };
      const expected: Record<AccountRoleFilter, string[]> = {
        Governors: ["governor", "governorAndModerator"],
        Contributors: ["contributor"],
        "Core Team": ["coreTeam"],
        Advisors: ["advisor"],
        Moderators: ["moderator", "governorAndModerator"],
        "Basic accounts": ["basic"],
      };
      const filters = Object.keys(expected) as AccountRoleFilter[];

      await accounts.open();
      await accounts.loaded();
      // Nothing chosen: everyone.
      for (const filter of filters) await expect(accounts.roleButton(filter)).toHaveAttribute("aria-pressed", "false");
      await expect.poll(shown).toEqual(keys);

      // Each filter by itself.
      for (const filter of filters) {
        await accounts.toggleRole(filter);
        await expect(accounts.roleButton(filter)).toHaveAttribute("aria-pressed", "true");
        await expect.poll(shown, `accounts listed under ${filter}`).toEqual(expected[filter]);
        await expect.poll(() => accounts.urlParam("roles")).toBe(ROLE_PARAM[filter]);
        await accounts.toggleRole(filter);
        await expect(accounts.roleButton(filter)).toHaveAttribute("aria-pressed", "false");
        await expect.poll(shown, `accounts listed after ${filter} is switched off`).toEqual(keys);
      }

      // Known app bug (see RATE_LIMIT_BUG): with more than a page of members
      // the two filters are refused, with fewer the last ones after the reload.
      test.fail(true, RATE_LIMIT_BUG);
      const short = { timeout: 5_000 };

      // Two filters: accounts with either role.
      await accounts.toggleRole("Governors");
      await accounts.toggleRole("Basic accounts");
      await expect.poll(shown, short).toEqual(["governor", "basic", "governorAndModerator"]);
      await expect.poll(() => accounts.urlParam("roles"), short).toBe("governor,basic");

      // The filter is in the address: a reload keeps it.
      await page.reload();
      await expect(accounts.roleButton("Governors")).toHaveAttribute("aria-pressed", "true", short);
      await expect(accounts.roleButton("Basic accounts")).toHaveAttribute("aria-pressed", "true", short);
      await expect(accounts.roleButton("Moderators")).toHaveAttribute("aria-pressed", "false", short);
      await expect.poll(shown, short).toEqual(["governor", "basic", "governorAndModerator"]);

      // All six chosen is the same as none.
      for (const filter of ["Contributors", "Core Team", "Advisors", "Moderators"] as const) {
        await accounts.toggleRole(filter);
      }
      await expect.poll(shown, short).toEqual(keys);
      expectNoGraphqlRefused(graphqlAnswers);
    },
  );

  test(
    "F5: a migrated member is listed once: the old wallet is hidden once its Society address has a profile",
    { tag: ["@core"] },
    async ({ page, subgraph, nextAccount }) => {
      const accounts = new AccountsPage(page);
      const graphqlAnswers = watchGraphqlAnswers(page);
      // The fork has members from before smart accounts in both states.
      const { migrated, pending } = await legacyPairsByState(subgraph);
      expect(migrated.length, "old wallets whose Society address has a profile").toBeGreaterThan(0);
      expect(pending.length, "old wallets whose Society address has no profile yet").toBeGreaterThan(0);
      // A directory of more than two pages, as a live one is, whatever else
      // is on the chain: the old wallets are hidden across pages, not only on
      // the first.
      await subgraph.overlay(
        ...Array.from({ length: 2 * PAGE_SIZE + 10 }, (_, index) =>
          directoryMember({
            address: nextAccount().address.toLowerCase(),
            profileBadgeId: 9_510_000 + index,
            name: `Filler ${index}`,
            createdAt: FAR_FUTURE + index,
          }),
        ),
      );
      const listed = await directoryAddresses(subgraph);

      await accounts.open();
      await accounts.loaded();
      // Known app bug (see RATE_LIMIT_BUG): the third page is refused with
      // 429 and the grid shows the error instead of the cards.
      test.fail(true, RATE_LIMIT_BUG);
      const short = { timeout: 5_000 };
      await accounts.scrollUntilLoaded(listed.size, short);
      const shown = await accounts.addresses();
      expect(new Set(shown).size, "every account is listed once").toBe(shown.length);

      // Migrated: only the Society address. Not migrated yet: only the old wallet.
      for (const pair of migrated) {
        expect(shown, `old wallet ${pair.wallet}`).not.toContain(pair.wallet);
        expect(shown, `Society address ${pair.society}`).toContain(pair.society);
      }
      for (const pair of pending) {
        expect(shown, `old wallet ${pair.wallet}`).toContain(pair.wallet);
        expect(shown, `Society address ${pair.society}`).not.toContain(pair.society);
      }

      // A search for a hidden wallet finds nothing either.
      await accounts.search(migrated[0].wallet);
      await expect(accounts.emptyState).toBeVisible(short);
      await expect(accounts.cards).toHaveCount(0, short);
      await accounts.search(migrated[0].society);
      await expect(accounts.cards).toHaveCount(1, short);
      await expect(accounts.card(migrated[0].society)).toBeVisible(short);

      // One of the others gets a profile on its Society address: from then on
      // the directory lists that address and no longer the old wallet.
      const [mover] = pending;
      await accounts.search(mover.wallet);
      await expect(accounts.card(mover.wallet)).toBeVisible(short);
      await subgraph.overlay(
        directoryMember({
          address: mover.society,
          profileBadgeId: 9_500_001,
          name: "Moved Over",
          createdAt: FAR_FUTURE,
        }),
      );
      await page.reload();
      await expect(accounts.searchInput).toHaveValue(mover.wallet, short);
      await expect(accounts.emptyState).toBeVisible(short);
      await accounts.search(mover.society);
      await expect(accounts.cards).toHaveCount(1, short);
      await expect(accounts.card(mover.society)).toContainText("Moved Over", short);
      expectNoGraphqlRefused(graphqlAnswers);
    },
  );

  test(
    "F6: a search that matches nobody says \"No accounts found\"",
    { tag: ["@edge"] },
    async ({ page, nextAccount }) => {
      const accounts = new AccountsPage(page);
      await accounts.open();
      await accounts.loaded();
      await expect(accounts.cards.first()).toBeVisible();
      await expect(accounts.emptyState).toBeHidden();

      // A name nobody has, and an address without a profile.
      await accounts.search("no-such-account-zzzz-0000");
      await expect(accounts.emptyState).toBeVisible();
      await expect(accounts.cards).toHaveCount(0);
      await expect(accounts.errorHeading).toBeHidden();
      // Back to the whole list first: the page keeps the last result up
      // until the next one is in, so an empty list after an empty list would
      // prove nothing.
      await accounts.clearSearchButton.click();
      await expect(accounts.cards.first()).toBeVisible();
      await expect(accounts.emptyState).toBeHidden();
      const nobody = nextAccount().address;
      await accounts.search(nobody);
      await expect(accounts.emptyState).toBeVisible();
      await expect(accounts.cards).toHaveCount(0);

      // The controls stay usable: clearing the search brings the list back.
      await accounts.clearSearchButton.click();
      await expect(accounts.cards.first()).toBeVisible();
      await expect(accounts.emptyState).toBeHidden();
    },
  );

  test(
    "F6: when the subgraph fails, the directory says so and offers Retry, which loads the list once it works again",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      const accounts = new AccountsPage(page);
      // Every "Users" request fails, also the repeats the app makes by itself
      // before it gives up (which is why the error takes some seconds to show).
      await subgraph.injectFaults({ kind: "graphql-error", operation: "Users", count: 100 });

      await accounts.open();
      await expect(accounts.errorHeading).toBeVisible();
      await expect(accounts.grid).toContainText("Users data is unavailable. Please try again.");
      await expect(accounts.retryButton).toBeVisible();
      await expect(accounts.cards).toHaveCount(0);
      await expect(accounts.emptyState).toBeHidden();
      // The page around the list is still there.
      await expect(accounts.searchInput).toBeVisible();
      await expect(accounts.roleFilter).toBeVisible();

      // The subgraph is back: Retry loads the list.
      await subgraph.clearFaults();
      await accounts.retryButton.click();
      await expect(accounts.cards.first()).toBeVisible();
      await expect(accounts.errorHeading).toBeHidden();
      await expect(accounts.retryButton).toBeHidden();
    },
  );

  test(
    "F7: a connected wallet without a profile is offered \"Setup Account\", which opens the setup wizard",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet }) => {
      const me = await persona("new");
      const accounts = new AccountsPage(page);

      await accounts.open();
      await accounts.loaded();
      // A visitor is offered it too, so the button alone says nothing about
      // the wallet: it has to still be there once the page knows who is
      // connected. (That it goes away for a member is the next test.)
      await expect(accounts.setupAccountButton).toBeVisible();
      await pages.shell.connect();
      await expect(pages.shell.accountButton).toHaveText(onlyShortAddress(me.address));
      await expect(accounts.setupAccountButton).toBeVisible();

      await accounts.setupAccountButton.click();
      await expect(page).toHaveURL(/\/profile\?setupOpen=true/);
      await expect(pages.onboarding.form).toBeVisible();
      await expect(pages.onboarding.nameInput).toHaveValue("");

      // Getting there asked the wallet for nothing but the connection.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "F7: a member is not offered \"Setup Account\", and finds the own card leading to /profile",
    { tag: ["@core"] },
    async ({ persona, pages, page, nextAccount }) => {
      const salt = nextAccount().address.slice(2, 8).toLowerCase();
      const me = await persona("member", { name: `Listed ${salt}` });
      const accounts = new AccountsPage(page);

      await accounts.open();
      await accounts.loaded();
      await pages.shell.connect();
      await expect(accounts.setupAccountButton).toBeHidden();

      // The member's own card is in the list, and it opens /profile, not /user/<address>.
      await accounts.search(`Listed ${salt}`);
      await expect(accounts.cards).toHaveCount(1);
      await expect(accounts.ownCard).toContainText(`Listed ${salt}`);
      await expect(accounts.card(me.address)).toHaveCount(0);
      await expect(accounts.setupAccountButton).toBeHidden();
      await accounts.ownCard.click();
      await expect(page).toHaveURL(/\/profile$/);
      await expect(pages.profile.details).toContainText(`Listed ${salt}`);
    },
  );

  test(
    "F7: a connected wallet that the subgraph knows, but that has no profile, is offered \"Setup Account\" too",
    { tag: ["@core"] },
    async ({ persona, pages, page, subgraph }) => {
      // The Society address is known to the subgraph without having a
      // profile, as it is for an address that was sent a badge before its
      // owner ever opened the Outpost.
      const me = await persona("new");
      await subgraph.overlay(user(me.address));
      const accounts = new AccountsPage(page);

      // Connect on /profile, where the setup prompt shows that the app has
      // loaded this user, then go to the directory without a reload: the
      // button's state is then final from the first render.
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.onboarding.setupPrompt).toBeVisible();
      await accounts.openFromSidebar();
      await accounts.loaded();
      await expect(accounts.cards.first()).toBeVisible();
      await expect(accounts.setupAccountButton).toBeVisible();
    },
  );
});
