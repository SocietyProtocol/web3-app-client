import type { Page } from "@playwright/test";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";

/**
 * P6 in the browser: what a page shows while the subgraph behind
 * /api/graphql is down (the route then answers 502, see
 * graphql.api.spec.ts). A page must say that something went wrong. It must
 * not be blank, and it must not present the missing answer as a fact
 * ("you have no profile", "there are no governors").
 *
 * Error states of the lists (accounts, badges, communities) are with those
 * areas: F6, G4, J4.
 */

/**
 * Any wording of "this could not be loaded": the app's ErrorDisplay
 * ("Something went wrong"), the message of a failed query ("... data is
 * unavailable. Please try again.") or a retry offer.
 */
const errorState = (page: Page) =>
  page.getByText(/something went wrong|is unavailable|could not be loaded|failed to load|try again/i).first();

/** Every request for this persisted query fails for the rest of the test. */
const DOWN = { kind: "http-error", status: 503, count: 1_000 } as const;

test.describe("pages while the subgraph is down", () => {
  test(
    "P6: a member whose profile cannot be loaded sees an error, not an empty page and not the setup prompt",
    { tag: ["@edge"] },
    async ({ persona, pages, page, subgraph, chain, wallet }) => {
      const me = await persona("member");
      expect(await chain.profileBadgeId(me.address)).toBe(me.profile!.badgeId);
      await subgraph.injectFaults({ ...DOWN, operation: "User" });

      await pages.profile.open();
      await pages.shell.connectButton.click();
      await pages.shell.walletOption.click();
      await expect
        .poll(
          async () =>
            (await subgraph.requests()).filter(
              (request) => request.operationName === "User" && request.variables.id === me.address.toLowerCase(),
            ).length,
          { message: "the page asked for the member and was refused" },
        )
        .toBeGreaterThan(0);

      // APP BUG (seen in a trace), expected to fail until it is fixed: the
      // page never settles. Profile.tsx renders a skeleton while
      // `user.isLoading`; once the query has failed it mounts ContentGuard,
      // whose own useUserQuery observer mounts on a failed query without
      // data, and TanStack Query fetches again on mount (`retryOnMount`
      // defaults to true). The query is loading again, Profile unmounts
      // ContentGuard, and so on: the User query is sent four times every
      // seven seconds for as long as the page is open, /profile stays a
      // skeleton and the header never shows the account button (it waits
      // for the same query). Everything above this line must pass.
      test.fail(true, "a failed User query makes /profile refetch it forever behind a skeleton");
      // The header shows the account button once the member's query has
      // ended, here: once the app has given up retrying it (three retries,
      // 1 + 2 + 4 s). Fifteen seconds leave a fixed app time for that on a
      // busy machine. Remove the timeout together with test.fail.
      await expect(pages.shell.accountButton).toBeVisible({ timeout: 15_000 });

      // Nothing pretends: no profile made of nothing, and no invitation to
      // set up an account that exists (the chain knows the profile).
      await expect(pages.profile.details).toBeHidden();
      await expect(pages.onboarding.setupPrompt).toBeHidden();
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // Not reached while the bug above is there, from reading the code:
      // Profile.tsx and ContentGuard.tsx only look at `user.data?.profile`,
      // which is undefined after a failed query as well, so ContentGuard
      // takes its "no profile" branch and renders AccountSetupBubble, which
      // hides itself because the chain says the account has a profile:
      // an empty page. Neither component reads `user.isError`.
      await expect(errorState(page)).toBeVisible({ timeout: 2_000 });
    },
  );

  test(
    "P6: /governance says that the Governors could not be loaded, not that there are none",
    { tag: ["@edge"] },
    async ({ pages, page, subgraph }) => {
      expect((await subgraph.holdersOf(GOVERNOR_BADGE)).length, "there are Governors").toBeGreaterThan(0);
      await subgraph.injectFaults({ ...DOWN, operation: "Badge" });

      await pages.governance.open();

      // What does not come from the subgraph is there: the page is not blank.
      await expect(page.getByRole("heading", { level: 1, name: "Governance" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Check Snapshot →" })).toBeVisible();

      // The list settles once the app has given up retrying.
      await expect(pages.governance.emptyState.or(errorState(page)).first()).toBeVisible();
      const asked = (await subgraph.requests()).filter((request) => request.operationName === "Badge");
      expect(asked.length, "the page asked for the Governor badge and was refused").toBeGreaterThan(0);
      await expect(pages.governance.governors.rows).toHaveCount(0);

      // A failed query is not an empty list: the Governors are on chain, the
      // page just could not load them, and it says so and offers a retry.
      await expect(errorState(page)).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
      await expect(pages.governance.emptyState).toBeHidden();
      await expect(pages.governance.governors.section).toBeVisible();
      await expect(pages.governance.governors.section).not.toContainText("Governors (0)");

      // The subgraph is back: Retry loads the Governors.
      await subgraph.clearFaults();
      await page.getByRole("button", { name: "Retry" }).click();
      await expect(pages.governance.governors.rows.first()).toBeVisible();
      await expect(errorState(page)).toBeHidden();
      await expect(page.getByRole("button", { name: "Retry" })).toBeHidden();
    },
  );
});
