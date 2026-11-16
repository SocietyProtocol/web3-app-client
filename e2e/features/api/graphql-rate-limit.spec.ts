import { expect, test } from "../../fixtures";
import { directoryMember } from "../../support/builders/accounts-directory";
import { GRAPHQL_BURST, neighbourOf, useUpGraphqlAllowance, watchGraphqlAnswers } from "../../support/graphql-limit";
import { ProfileDetails } from "../../support/pages/profile-details";

/**
 * The /api/graphql rate limit as a visitor meets it (the route's contract
 * is P8 in graphql-contract.api.spec.ts). The limit is a bucket of sixty
 * requests per Cloudflare visitor IP that refills one a second.
 *
 * The page is a public profile, /user/<address>, of a member pushed as an
 * overlay: it needs no wallet and asks /api/graphql for a handful of
 * queries, so a few refilled tokens are enough for it.
 */

test.describe("the /api/graphql rate limit in the browser", () => {
  test(
    "P9: a visitor gets the page although a neighbour behind the same Cloudflare edge has used up their allowance",
    { tag: ["@core"] },
    async ({ page, api, pages, subgraph, testIp, nextAccount }) => {
      const member = nextAccount().address.toLowerCase();
      const name = `Limit Lena ${member.slice(2, 8)}`;
      await subgraph.overlay(...directoryMember({ address: member, profileBadgeId: 9_400_001, name, bio: "Read by a neighbour." }));

      // The neighbour arrives through the same edge, so with the same
      // x-forwarded-for hop as this visitor's browser (the network rules
      // send testIp in both headers); only cf-connecting-ip differs. Before
      // the route keyed on the visitor IP, this used up the browser's
      // allowance as well.
      const neighbour = { "cf-connecting-ip": neighbourOf(testIp), "x-forwarded-for": testIp };
      const { served } = await useUpGraphqlAllowance(api, neighbour);
      expect(served).toBeGreaterThanOrEqual(GRAPHQL_BURST);

      const answers = watchGraphqlAnswers(page);
      const profile = new ProfileDetails(page);
      await pages.profile.openUser(member);
      await expect(profile.heading(name)).toBeVisible();
      await expect(pages.profile.details).toContainText("Read by a neighbour.");

      expect(answers.served(), "the page asked /api/graphql").toBeGreaterThan(0);
      expect(answers.statuses().filter((status) => status !== 200), "no request of the page was refused").toEqual([]);
    },
  );

  test(
    "P10: a visitor who has used up the allowance gets the page a few seconds later, as tokens refill, not after a minute",
    { tag: ["@edge"] },
    async ({ page, api, pages, subgraph, nextAccount }) => {
      const member = nextAccount().address.toLowerCase();
      const name = `Limit Lars ${member.slice(2, 8)}`;
      await subgraph.overlay(...directoryMember({ address: member, profileBadgeId: 9_400_002, name, bio: "Read after a wait." }));

      // The browser and `api` are the same visitor (testIp).
      await useUpGraphqlAllowance(api);
      const opened = Date.now();

      const answers = watchGraphqlAnswers(page);
      const profile = new ProfileDetails(page);
      await pages.profile.openUser(member);
      // The page's first requests are refused...
      await expect.poll(() => answers.refused(), { message: "the page was refused at first" }).toBeGreaterThan(0);
      // ...and the app's own retries (after 1, 2 and 4 seconds) are served
      // from the tokens that refilled meanwhile: the profile is there well
      // inside the minute a fixed window would make it wait.
      await expect(profile.heading(name)).toBeVisible({ timeout: 20_000 });
      await expect(pages.profile.details).toContainText("Read after a wait.");
      expect(Date.now() - opened, "the page arrived well inside the minute").toBeLessThan(30_000);
      await expect(pages.profile.details.getByText(/something went wrong|is unavailable/i)).toHaveCount(0);
    },
  );
});
