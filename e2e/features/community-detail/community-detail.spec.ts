import { expect, test } from "../../fixtures";
import {
  communityActivity,
  communityMember,
  fakeAddress,
  fakeTxHash,
  nowInSeconds,
  withoutCommunity,
  type ActivityType,
} from "../../support/builders/communities-entities";
import { badge, user } from "../../support/builders/entities";
import { BadgeCreatePage } from "../../support/pages";
import { CommunityDetailPage } from "../../support/pages/community-detail";
import { EXPLORER_TX, fakeCommunity } from "./steps";

/**
 * /communities/<id>: what everybody can see of a community.
 *
 * Every community here exists only in the subgraph fake (it does not follow
 * the CommunityRegistry): the page reads a community, its members and its
 * activity from the subgraph alone, and so does its decision who the
 * manager is. The tests that write to a community are in
 * community-manage.spec.ts, on a community that is on chain as well.
 */

const DAY = 24 * 60 * 60;

/** Noon UTC on the 15th, `months` months from now: far from any month's edge in every time zone. */
function midMonth(months: number): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 15, 12) / 1000;
}

test.describe("community detail: looking at a community", () => {
  test(
    "K1: a community's page shows its name, counts, tier and expiry, and an Overview with the member count, About and Recent Activity",
    { tag: ["@smoke"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const expiresAt = midMonth(7);
      const harbour = fakeCommunity({
        id: 9_100_101,
        name: "K1 Harbour",
        tier: "gold",
        tierExpiresAt: expiresAt,
        description: "A place for people who like boats.",
        members: ["Ada Harbour", "Grace Harbour", "Edsger Harbour"],
      });
      await subgraph.overlay(harbour.ops);

      const response = await detail.open(harbour.id);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/Community #9100101/);

      // The header.
      await expect(detail.name("K1 Harbour")).toBeVisible();
      await expect(detail.counts).toHaveText("3 Members · 3 Badges");
      await expect(detail.tierLabel).toHaveText("Gold Community");
      const monthYear = new Date(expiresAt * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      await expect(detail.tierExpiry).toHaveText(`Valid until · ${monthYear}`);

      // The Overview is the tab a plain link opens.
      await expect(detail.tab("overview")).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("heading", { name: "3", exact: true })).toBeVisible();
      await expect(detail.aboutHeading).toBeVisible();
      await expect(page.getByText("A place for people who like boats.", { exact: true })).toBeVisible();

      // Recent Activity, newest first: the three members joining.
      await expect(detail.recentActivityHeading).toBeVisible();
      await expect(detail.activityRows).toHaveCount(3);
      expect(await detail.activityTypes()).toEqual(Array(3).fill("MemberJoinedActivity"));
      await expect(detail.activityRows).toContainText([
        "Edsger Harbour",
        "Grace Harbour",
        "Ada Harbour",
      ]);
      await expect(detail.activityRows.first()).toContainText("joined the community");
      await expect(detail.loadMoreActivitiesButton).toHaveCount(0);
    },
  );

  test(
    "K1: a community without a tier, or whose tier has run out, is unaffiliated and shows no expiry",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const never = fakeCommunity({ id: 9_100_111, name: "K1 Never Tiered", tier: "unaffiliated" });
      const lapsed = fakeCommunity({
        id: 9_100_121,
        name: "K1 Lapsed Silver",
        tier: "silver",
        tierExpiresAt: nowInSeconds() - DAY,
      });
      await subgraph.overlay(never.ops, lapsed.ops);

      await detail.open(never.id);
      await expect(detail.name("K1 Never Tiered")).toBeVisible();
      await expect(detail.tierLabel).toHaveText("Unaffiliated Community");
      await expect(detail.tierExpiry).toHaveCount(0);
      // No description: no About. No members: a zero.
      await expect(detail.counts).toHaveText("0 Members · 3 Badges");
      await expect(detail.aboutHeading).toHaveCount(0);
      await expect(detail.noActivity).toBeVisible();

      await detail.open(lapsed.id);
      await expect(detail.name("K1 Lapsed Silver")).toBeVisible();
      await expect(detail.tierLabel).toHaveText("Unaffiliated Community");
      await expect(detail.tierExpiry).toHaveCount(0);
    },
  );

  test(
    "K2: a community that does not exist gives the 404 page",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      // One that does exist, to know that the others are missing and not broken.
      const real = fakeCommunity({ id: 9_100_201, name: "K2 Exists" });
      await subgraph.overlay(real.ops);
      expect((await detail.open(real.id))?.status()).toBe(200);
      await expect(detail.name("K2 Exists")).toBeVisible();

      for (const missing of ["9100299", "not-a-community"]) {
        const response = await detail.open(missing);
        expect(response?.status(), `/communities/${missing}`).toBe(404);
        await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
        await expect(page.getByRole("tab")).toHaveCount(0);
      }
    },
  );

  test(
    "K3: the tabs follow ?tab=, Governance is a placeholder, and Settings is not there for a visitor or a member, deep-linked or not",
    { tag: ["@core"] },
    async ({ page, persona, pages, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("member", { name: "K3 Plain Member" });
      const town = fakeCommunity({ id: 9_100_301, name: "K3 Town", members: 2 });
      await subgraph.overlay(
        town.ops,
        // The connected member belongs to it, and does not manage it.
        communityMember({
          communityId: town.id,
          address: me.address,
          badgeId: town.memberBadgeId,
          joinedAt: nowInSeconds() - 60,
        }),
      );

      // ?tab=members opens the Members tab.
      await detail.open(town.id, "members");
      await expect(detail.tab("members")).toHaveAttribute("aria-selected", "true");
      await expect(detail.membersTable).toBeVisible();
      await expect(detail.recentActivityHeading).toHaveCount(0);

      // Four tabs for a visitor. A click moves the tab and the URL with it.
      await expect(page.getByRole("tab")).toHaveText(["Overview", "Members", "Badges", /^Governance\s*Coming Soon$/]);
      await detail.openTab("badges");
      await expect(page).toHaveURL(/[?&]tab=badges(&|$)/);
      await expect(detail.badgeCards).toHaveCount(3);
      await expect(detail.membersTable).toHaveCount(0);

      // Governance: nothing yet.
      await detail.openTab("governance");
      await expect(page).toHaveURL(/[?&]tab=governance(&|$)/);
      await expect(detail.governanceComingSoon).toBeVisible();
      await expect(page.getByText("Stay tuned for updates", { exact: true })).toBeVisible();

      await detail.openTab("overview");
      await expect(detail.recentActivityHeading).toBeVisible();
      await expect(page).not.toHaveURL(/tab=(members|badges|governance)/);

      // A visitor who follows a link to the settings gets no Settings tab and none of its content.
      await detail.open(town.id, "settings");
      await expect(detail.name("K3 Town")).toBeVisible();
      await expect(detail.tab("settings")).toHaveCount(0);
      await expect(detail.generalInformation).toHaveCount(0);
      await expect(detail.editInfoButton).toHaveCount(0);
      await expect(detail.transferOwnershipButton).toHaveCount(0);

      // Nor does a connected member. Its own row says "(You)": the page knows who is connected.
      await pages.shell.connect();
      await detail.openTab("members");
      await expect(detail.memberRow(me.address)).toContainText("(You)");
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined"]);
      await expect(detail.tab("settings")).toHaveCount(0);
      await expect(detail.badgeActions).toHaveCount(0);
      await expect(detail.revokeButton(detail.memberRows.first())).toHaveCount(0);
    },
  );

  test(
    "K3: the manager has a Settings tab, and a link to ?tab=settings opens it",
    { tag: ["@core"] },
    async ({ page, persona, pages, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("member", { name: "K3 Manager" });
      const town = fakeCommunity({
        id: 9_100_311,
        name: "K3 Managed Town",
        manager: me.address,
        description: "Managed by the connected member.",
      });
      await subgraph.overlay(town.ops);

      // Before the wallet is connected the link shows no settings.
      await detail.open(town.id, "settings");
      await expect(detail.name("K3 Managed Town")).toBeVisible();
      await expect(detail.tab("settings")).toHaveCount(0);
      await expect(detail.generalInformation).toHaveCount(0);

      // Connected as the manager: the tab appears, already open.
      await pages.shell.connect();
      await expect(detail.tab("settings")).toHaveAttribute("aria-selected", "true");
      await expect(detail.generalInformation).toBeVisible();
      await expect(detail.badgeModifications).toBeVisible();
      await expect(detail.editInfoButton).toBeEnabled();
      for (const role of ["manager", "assistant", "member"] as const) {
        await expect(detail.editBadgeButton(role)).toBeEnabled();
      }
      await expect(detail.transferOwnershipButton).toBeEnabled();
      await expect(page.getByText("Managed by the connected member.", { exact: true })).toBeVisible();

      // The other tabs are still there, and Settings stays when coming back.
      await detail.openTab("overview");
      await expect(detail.generalInformation).toHaveCount(0);
      await detail.openTab("settings");
      await expect(page).toHaveURL(/[?&]tab=settings(&|$)/);
      await expect(detail.generalInformation).toBeVisible();
    },
  );

  test(
    "K4: Recent Activity describes every kind of event, links each to its transaction, and loads more on request",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const works = fakeCommunity({ id: 9_100_401, name: "K4 Works" });
      const [ann, bob] = [fakeAddress(9_100_491), fakeAddress(9_100_492)];
      const memberBadge = String(works.memberBadgeId);
      const oldest = nowInSeconds() - 20 * DAY;

      // Oldest first; the feed shows them the other way round, seven at a time.
      const events: { type: ActivityType; fields?: Record<string, string>; says: string[] }[] = [
        { type: "CommunityCreatedActivity", fields: { creator: works.manager }, says: ["Community created"] },
        {
          type: "CommunityBadgeLinkedActivity",
          fields: { badge: memberBadge },
          says: ["Badge created:", "K4 Works Member"],
        },
        {
          type: "MemberJoinedActivity",
          fields: { user: ann, badge: memberBadge },
          says: ["Ann Activity", "joined the community"],
        },
        {
          type: "BadgeMintedActivity",
          fields: { user: ann, badge: memberBadge },
          says: ["Badge", "K4 Works Member", "minted to", "Ann Activity"],
        },
        {
          type: "BadgeBurnedActivity",
          fields: { user: bob, badge: memberBadge },
          says: ["Badge", "K4 Works Member", "burned from", "Bob Activity"],
        },
        {
          type: "MemberLeftActivity",
          fields: { user: bob, badge: memberBadge },
          says: ["Bob Activity", "left the community"],
        },
        {
          type: "MemberTransferredActivity",
          fields: { fromUser: ann, toUser: bob, badge: memberBadge },
          says: ["Membership transferred from", "Ann Activity", "Bob Activity"],
        },
        {
          type: "ManagerChangedActivity",
          fields: { fromManager: bob, toManager: ann, badge: String(works.managerBadgeId) },
          says: ["Manager changed from", "Bob Activity", "Ann Activity"],
        },
        { type: "CommunityDetailsUpdatedActivity", says: ["Community details updated"] },
        {
          type: "CommunityTierGrantedActivity",
          fields: { tierId: "3", tierName: "gold", tierExpiresAt: String(nowInSeconds() + 90 * DAY) },
          says: ["Gold tier granted", "· expires"],
        },
        {
          type: "CommunityTierRevokedActivity",
          fields: { previousTierId: "2", previousTierName: "silver" },
          says: ["Silver tier revoked"],
        },
      ];
      await subgraph.overlay(
        works.ops,
        user(ann, { name: "Ann Activity" }),
        user(bob, { name: "Bob Activity" }),
        events.map((event, index) =>
          communityActivity({
            type: event.type,
            id: `e2e-k4-${index}`,
            communityId: works.id,
            timestamp: oldest + index * 3_600,
            txHash: fakeTxHash(9_100_400 + index),
            fields: event.fields,
          }),
        ),
      );
      const newestFirst = events.map((event, index) => ({ ...event, index })).reverse();

      await detail.open(works.id);
      await expect(detail.activityRows).toHaveCount(7);
      expect(await detail.activityTypes()).toEqual(newestFirst.slice(0, 7).map((event) => event.type));

      await detail.loadMoreActivitiesButton.click();
      await expect(detail.activityRows).toHaveCount(events.length);
      expect(await detail.activityTypes()).toEqual(newestFirst.map((event) => event.type));
      // Eleven events, seven to a page: the second page is the last.
      await expect(detail.loadMoreActivitiesButton).toHaveCount(0);

      for (const event of newestFirst) {
        const row = detail.activityRow(event.type);
        for (const text of event.says) await expect(row, event.type).toContainText(text);
        await expect(detail.activityTransactionLink(row), event.type).toHaveAttribute(
          "href",
          `${EXPLORER_TX}${fakeTxHash(9_100_400 + event.index)}`,
        );
      }

      // A badge named in an event links to the badge.
      await expect(
        detail.activityRow("CommunityBadgeLinkedActivity").getByRole("link", { name: /^View badge/ }),
      ).toHaveAttribute("href", `/badges/${memberBadge}`);
    },
  );

  test(
    "K5: the Members tab lists the members ten to a page, newest first, and can be sorted",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      // Names in an order of their own: the i-th to join is not the i-th by name.
      const names = Array.from({ length: 23 }, (_, index) => `K5 Member ${String(((index * 7) % 23) + 1).padStart(2, "0")}`);
      const guild = fakeCommunity({ id: 9_100_501, name: "K5 Guild", members: names });
      await subgraph.overlay(guild.ops);
      const oldestFirst = guild.members.map((member) => member.address);
      const newestFirst = [...oldestFirst].reverse();
      const byName = [...guild.members]
        .sort((left, right) => (left.name < right.name ? -1 : 1))
        .map((member) => member.address);

      await detail.open(guild.id, "members");
      await expect(detail.counts).toHaveText("23 Members · 3 Badges");
      await expect(detail.memberColumnHeaders).toHaveText(["Member", "Joined"]);
      await expect(detail.membersSortSelect).toHaveText("Newest");

      // Page 1 of 3.
      await expect(detail.memberRows).toHaveCount(10);
      expect(await detail.memberAddresses()).toEqual(newestFirst.slice(0, 10));
      await expect(detail.memberRows.first()).toContainText(guild.members[22].name);
      await expect(detail.pageButton(1)).toHaveAttribute("aria-current", /^(page|true)$/);
      await expect(detail.pageButton(3)).toBeVisible();
      await expect(detail.pageButton(4)).toHaveCount(0);
      await expect(detail.previousPageButton).toBeDisabled();

      // Next: page 2.
      await detail.nextPageButton.click();
      await expect(detail.pageButton(2)).toHaveAttribute("aria-current", /^(page|true)$/);
      await expect.poll(() => detail.memberAddresses()).toEqual(newestFirst.slice(10, 20));
      await expect(detail.previousPageButton).toBeEnabled();

      // The last page, by its number: the three oldest members, and no further.
      await detail.pageButton(3).click();
      await expect.poll(() => detail.memberAddresses()).toEqual(newestFirst.slice(20));
      await expect(detail.nextPageButton).toBeDisabled();

      // Another order starts again at page 1.
      await detail.sortMembersBy("Oldest");
      await expect(detail.pageButton(1)).toHaveAttribute("aria-current", /^(page|true)$/);
      await expect.poll(() => detail.memberAddresses()).toEqual(oldestFirst.slice(0, 10));

      await detail.sortMembersBy("Name");
      await expect.poll(() => detail.memberAddresses()).toEqual(byName.slice(0, 10));
      await expect(detail.memberRows.first()).toContainText("K5 Member 01");
      await expect(detail.previousPageButton).toBeDisabled();
      await detail.nextPageButton.click();
      await expect.poll(() => detail.memberAddresses()).toEqual(byName.slice(10, 20));
    },
  );

  test(
    "K5: the member search finds members by name or address, ten at a time with Load more",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      // Names on profile Metadata, as the real subgraph has them: graph-node
      // cannot reach them from a membership filter (user_.metadata_ is two
      // child-filter levels), so the search must find them another way.
      const guild = fakeCommunity({ id: 9_100_511, name: "K5 Search Guild", members: 23, namesInMetadata: true });
      await subgraph.overlay(guild.ops);
      const newestFirst = [...guild.members].reverse();
      const addresses = (members: typeof guild.members) => members.map((member) => member.address);

      await detail.open(guild.id, "members");
      await expect(detail.memberRows).toHaveCount(10);

      // A part of a name: "Member 2" is in Member 20 to 23. No pages, nothing more to load.
      await detail.membersSearchInput.fill("member 2");
      await expect(detail.memberRows).toHaveCount(4);
      expect(await detail.memberAddresses()).toEqual(addresses(newestFirst.slice(0, 4)));
      await expect(detail.pageButton(1)).toHaveCount(0);
      await expect(detail.nextPageButton).toHaveCount(0);
      await expect(detail.loadMoreMembersButton).toHaveCount(0);

      // Every member matches: ten, and Load more for the next ten, and the last three.
      await detail.membersSearchInput.fill("Member");
      await expect(detail.memberRows).toHaveCount(10);
      expect(await detail.memberAddresses()).toEqual(addresses(newestFirst.slice(0, 10)));
      await detail.loadMoreMembersButton.click();
      await expect(detail.memberRows).toHaveCount(20);
      await detail.loadMoreMembersButton.click();
      await expect(detail.memberRows).toHaveCount(23);
      expect(await detail.memberAddresses()).toEqual(addresses(newestFirst));
      await expect(detail.loadMoreMembersButton).toHaveCount(0);

      // An address, in full.
      const someone = guild.members[6];
      await detail.membersSearchInput.fill(someone.address);
      await expect(detail.memberRows).toHaveCount(1);
      await expect(detail.memberRow(someone.address)).toContainText(someone.name);

      // Nobody.
      await detail.membersSearchInput.fill("nobody by this name");
      await expect(detail.noMembersMatch).toBeVisible();
      await expect(detail.memberRows).toHaveCount(0);
      await expect(detail.noMembers).toHaveCount(0);

      // The cross brings the pages back.
      await page.getByRole("button", { name: "Clear search" }).click();
      await expect(detail.memberRows).toHaveCount(10);
      await expect(detail.pageButton(3)).toBeVisible();
      await expect(detail.noMembersMatch).toHaveCount(0);
    },
  );

  test(
    "K5: a community without members says so",
    { tag: ["@edge"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const empty = fakeCommunity({ id: 9_100_521, name: "K5 Empty Hall" });
      await subgraph.overlay(empty.ops);

      await detail.open(empty.id, "members");
      await expect(detail.membersTable).toBeVisible();
      await expect(detail.noMembers).toBeVisible();
      await expect(detail.memberRows).toHaveCount(0);
      await expect(detail.pageButton(1)).toHaveCount(0);
      await expect(detail.noMembersMatch).toHaveCount(0);
    },
  );

  test(
    "K9: the Badges tab lists the community's badges, and a visitor gets no Create Badge",
    { tag: ["@core"] },
    async ({ page, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const studio = fakeCommunity({ id: 9_100_901, name: "K9 Studio" });
      const bare = fakeCommunity({ id: 9_100_911, name: "K9 Bare" });
      await subgraph.overlay(
        studio.ops,
        badge(String(studio.memberBadgeId), { holdersCount: "2" }),
        // A community whose badges the subgraph does not (yet) link to it.
        bare.ops,
        withoutCommunity(bare.managerBadgeId),
        withoutCommunity(bare.assistantBadgeId),
        withoutCommunity(bare.memberBadgeId),
      );

      await detail.open(studio.id, "badges");
      await expect(detail.tab("badges")).toHaveAttribute("aria-selected", "true");
      await expect(detail.badgeCards).toHaveCount(3);
      expect([...(await detail.badgeIds())].sort()).toEqual(
        [studio.managerBadgeId, studio.assistantBadgeId, studio.memberBadgeId].map(String),
      );

      // A card: the name, which leads to the badge, and how many hold it.
      const member = detail.badgeCard(studio.memberBadgeId);
      await expect(member).toContainText("K9 Studio Member");
      await expect(member).toContainText("2 holders");
      await expect(member.getByRole("link").filter({ hasText: "K9 Studio Member" })).toHaveAttribute(
        "href",
        `/badges/${studio.memberBadgeId}`,
      );
      await expect(detail.badgeCard(studio.managerBadgeId)).toContainText("K9 Studio Manager");
      await expect(detail.badgeCard(studio.assistantBadgeId)).toContainText("K9 Studio Assistant");
      await expect(detail.badgeCard(studio.assistantBadgeId)).toContainText("0 holders");

      await expect(detail.createBadgeLink).toHaveCount(0);

      // No badges at all.
      await detail.open(bare.id, "badges");
      await expect(detail.counts).toHaveText("0 Members · 0 Badges");
      await expect(detail.noBadges).toBeVisible();
      await expect(detail.badgeCards).toHaveCount(0);

      // A badge with one holder takes the singular. The count arrives from
      // the subgraph as the string "1".
      await detail.open(studio.id, "badges");
      await expect(detail.badgeCard(studio.managerBadgeId)).toContainText("K9 Studio Manager");
      await expect(detail.badgeCard(studio.managerBadgeId)).toContainText("1 holder");
      await expect(detail.badgeCard(studio.managerBadgeId)).not.toContainText("1 holders");
    },
  );

  test(
    "K9: the manager's Create Badge on the Badges tab opens the badge wizard for this community",
    { tag: ["@core"] },
    async ({ page, persona, pages, subgraph }) => {
      const detail = new CommunityDetailPage(page);
      const me = await persona("member", { name: "K9 Manager" });
      const studio = fakeCommunity({ id: 9_100_921, name: "K9 Managed Studio", manager: me.address });
      await subgraph.overlay(studio.ops);

      await detail.open(studio.id, "badges");
      await expect(detail.badgeCards).toHaveCount(3);
      await expect(detail.createBadgeLink).toHaveCount(0);

      await pages.shell.connect();
      await expect(detail.createBadgeLink).toHaveAttribute("href", `/communities/${studio.id}/create-badge`);
      await detail.createBadgeLink.click();
      await expect(page).toHaveURL(new RegExp(`/communities/${studio.id}/create-badge$`));
      await expect(new BadgeCreatePage(page).heading).toBeVisible();
      await expect(new BadgeCreatePage(page).nameInput).toBeVisible();
    },
  );
});
