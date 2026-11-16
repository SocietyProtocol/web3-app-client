import { URLS as APP_URLS } from "../../../src/consts/urls";
import { expect, test } from "../../fixtures";
import { newCommunity } from "../../support/builders/entities";
import { GovernanceContent } from "../../support/pages/governance-content";

/**
 * The parts of governance that are not the list of Governors (see
 * governance.spec.ts for that): the text and the Snapshot links of
 * /governance, and the placeholder behind a community's "Governance" tab.
 */

/**
 * The two Snapshot spaces the tested build is configured with
 * (NEXT_PUBLIC_SNAPSHOT_URL and NEXT_PUBLIC_SNAPSHOT_SPEC_URL in
 * APP_BUILD_ENV, e2e/support/stack/config.mjs). Repeated here because the
 * launcher's settings are plain JavaScript that a spec cannot import. They
 * are not real places: the browser's request for them is refused.
 */
const SNAPSHOT_URL = "https://snapshot.invalid/#/s:e2e-society.eth";
const SNAPSHOT_SPEC_URL = "https://snapshot.invalid/#/s:e2e-spec.eth";

const isExternal = (href: string) => /^(https?:)?\/\//.test(href);

test.describe("governance: the page and the community tab", () => {
  test(
    "L1: /governance shows its text and both Snapshot links with the configured addresses, opening in a new tab",
    { tag: ["@smoke"] },
    async ({ page, context, pages, api, network, wallet }) => {
      const content = new GovernanceContent(page);
      const markdown = await (await api.get("/api/copywriting/governance")).text();

      await pages.governance.open();
      await expect(content.heading).toBeVisible();

      // The text: every paragraph of the source that is plain prose is on
      // the page as written, and no placeholder is left in what is shown.
      const paragraphs = markdown.split(/\n\s*\n/).map((paragraph) => paragraph.trim());
      const plain = paragraphs.filter((paragraph) => paragraph && !/[[\]<>*_#`{}]/.test(paragraph));
      expect(plain.length, "the governance text has plain paragraphs").toBeGreaterThan(0);
      for (const paragraph of plain) await expect(page.getByText(paragraph, { exact: true })).toBeVisible();
      await expect(content.textFailed).toHaveCount(0);
      await expect(page.getByText("{{")).toHaveCount(0);

      // The links inside the text, as the source has them. The SPEC space is
      // a placeholder in the source and the configured address on the page.
      // Links to other sites open in a new tab, links into the app do not.
      const links = [...markdown.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map(([, name, href]) => ({ name, href }));
      expect(links.map((link) => link.href)).toContain("{{snapshotSpecUrl}}");
      for (const { name, href } of links) {
        const expected = href.replace("{{snapshotSpecUrl}}", SNAPSHOT_SPEC_URL);
        const link = content.textLink(name);
        await expect(link).toHaveAttribute("href", expected);
        if (isExternal(expected)) {
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", /noopener/);
        } else {
          await expect(link).not.toHaveAttribute("target", "_blank");
        }
      }

      // The two buttons: one space each, in a new tab, without a way back to this page.
      await expect(content.snapshotLink).toHaveAttribute("href", SNAPSHOT_URL);
      await expect(content.specSnapshotLink).toHaveAttribute("href", SNAPSHOT_SPEC_URL);
      for (const link of [content.snapshotLink, content.specSnapshotLink]) {
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", /noopener/);
        await expect(link).toHaveAttribute("rel", /noreferrer/);
      }

      // A click really opens another tab for the Snapshot space and leaves
      // this one where it is. (The space is not a real host: the request is
      // refused by the test network, which records it.)
      const opened = context.waitForEvent("page");
      await content.snapshotLink.click();
      const tab = await opened;
      expect(tab).not.toBe(page);
      await expect
        .poll(() => network.blocked.filter((url) => url.startsWith(new URL(SNAPSHOT_URL).origin)).length)
        .toBeGreaterThan(0);
      await tab.close();
      await expect(page).toHaveURL(/\/governance$/);
      await expect(content.heading).toBeVisible();

      // Reading the page asks the wallet for nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    'L7: a community\'s Governance tab is a "Coming soon" placeholder with links to X and Discord',
    { tag: ["@edge"] },
    async ({ page, nextAccount, subgraph, wallet }) => {
      // A community that exists in the subgraph only: the tab reads nothing
      // from the chain.
      const communityId = "990701";
      const name = "Governance Tab Guild";
      await subgraph.overlay(
        newCommunity({ id: communityId, name, manager: nextAccount().address, managerBadgeId: "990702" }),
      );
      const content = new GovernanceContent(page);

      // From the overview, by its tab.
      await content.openCommunity(communityId);
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(content.communityTabNamed("Overview")).toHaveAttribute("aria-selected", "true");
      await expect(content.communityTab).toContainText("Coming Soon");
      await expect(content.comingSoon).toBeHidden();
      await content.communityTab.click();
      await expect(page).toHaveURL(new RegExp(`/communities/${communityId}\\?tab=governance$`));
      await expect(content.communityTab).toHaveAttribute("aria-selected", "true");
      await expect(content.comingSoon).toBeVisible();
      await expect(content.stayTuned).toBeVisible();

      // By its address.
      await content.openCommunity(communityId, "governance");
      await expect(content.communityTab).toHaveAttribute("aria-selected", "true");
      await expect(content.comingSoon).toBeVisible();
      await expect(content.stayTuned).toBeVisible();

      // The two places to follow for news, each in a new tab.
      await expect(content.xLink).toHaveAttribute("href", APP_URLS.TWITTER);
      await expect(content.discordLink).toHaveAttribute("href", APP_URLS.DISCORD);
      for (const link of [content.xLink, content.discordLink]) {
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", /noopener/);
      }

      // The other tabs are still one click away, and nothing asked for a wallet.
      await content.communityTabNamed("Overview").click();
      await expect(content.comingSoon).toBeHidden();
      await expect(page).not.toHaveURL(/tab=governance/);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
