/**
 * Template for a feature spec. Copy it to e2e/features/<area>/<name>.spec.ts.
 *
 * File name decides the project:
 *   *.spec.ts          hermetic         a browser against the local stack
 *   *.api.spec.ts      api              no browser: `api`, `graphql`, `chain`, `actor`
 *   *.serial.spec.ts   hermetic-serial  changes state that other tests read
 *   *.timetravel.spec.ts  hermetic-timetravel  moves the chain's clock; runs last
 *
 * Rules (the full list is in e2e/README.md):
 *   - The title starts with the scenario ID from the area's SCENARIOS.md.
 *   - Tags go in the details object: one of @smoke | @core | @edge, the write
 *     route if there is one (@sponsored | @owner-tx), and @unverified for a
 *     test that has never been run (it is then left out of every run; remove
 *     the tag once it has). A flaky test is fixed, not tagged: find the wait
 *     that is missing.
 *   - Every write asserts the wallet's request log AND reads the chain.
 *   - No sleeps. Wait for what the user would see, or use wallet.holdNext().
 *   - Locators: role, label or text first, then data-testid. Never CSS structure.
 *
 * This file is not collected by any project (it is outside features/).
 */
import { expect, test } from "../fixtures";

test.describe("<area>", () => {
  test(
    "X1: <what the user can do, in one sentence>",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, pages, wallet, chain }) => {
      // 1. Who is acting. The persona is seeded on chain and becomes the wallet's account.
      const me = await persona("member");

      // 2. Act through the UI, with page objects.
      await pages.onboarding.open();
      await pages.shell.connect();
      wallet.clearRequests(); // look only at what the action itself asks the wallet

      // await pages.<feature>.<action>(...);
      // await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });

      // 3. What the wallet was asked for: this is how a test knows who paid.
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // 4. What is true on chain afterwards.
      expect(await chain.profileBadgeId(me.address)).toBe(me.profile!.badgeId);
    },
  );
});
