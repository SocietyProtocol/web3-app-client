import { isAddressEqual, toHex } from "viem";
import { FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY } from "../../../src/lib/aa/rate-limit";
import { FIRST_BADGE_REASONS } from "../../support/first-badge";
import { BADGES_ADDRESS, CHAIN_ID, ENTRY_POINT_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { badgesCallOf, deploysSender } from "../../support/aa/traffic";
import {
  FIRST_BADGE_HEADER,
  FREE_BADGE_NOTICE_TEST_ID,
  badgesCreatedBy,
  enableFreeFirstBadge,
  freeBadgeCallData,
  nextNonce,
} from "../../support/first-badge";
import { AA_RPC_PATH, unsignedUserOperation } from "../../support/aa/requests";
import {
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectSponsoredThroughAccount,
} from "../../support/write-route";

/**
 * The free first badge (SPONSOR_FIRST_BADGE, src/lib/aa/first-badge.ts):
 * Society pays for a member's first createBadge from their Society account;
 * every badge after it is paid by the wallet as before. The stack runs with
 * the switch off; each test here that wants it on sets the suite's cookie
 * (support/first-badge.ts) before the page loads.
 *
 * Written without being run (the stack was in use by another run): every
 * test is @unverified until it has passed once. See "Unverified specs" in
 * e2e/README.md.
 */
test.describe("badge creation: the free first badge", { tag: "@unverified" }, () => {
  test(
    "I11: a member's first badge is sponsored: one signature, no wallet transaction, created by the Society account",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, pages, page, context, wallet, aa, chain, seenText }) => {
      await enableFreeFirstBadge(context);
      // A member without ETH: if anything but the paymaster had to pay, the
      // write could not happen at all.
      const me = await persona("member");
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));
      expect(await badgesCreatedBy(chain, me.address)).toHaveLength(1); // its profile badge only
      const name = `E2E Free Badge ${me.address.slice(2, 8)}`;

      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(name);
      await expect(page.getByTestId(FREE_BADGE_NOTICE_TEST_ID)).toHaveText(
        "Your first badge is free: Society pays the network fee.",
      );

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.badgeCreate.finishButton.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge created successfully", {
        timeout: 60_000,
      });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One signature for the user operation (no metadata, so no upload
      // signature), no transaction, nobody's ETH moved.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expect(deploysSender(userOperation)).toBe(false);
      const call = badgesCallOf(userOperation);
      expect(isAddressEqual(call.to, BADGES_ADDRESS)).toBe(true);
      expect(call.functionName).toBe("createBadge");
      expect(call.args.slice(0, 3)).toEqual([name, false, false]);
      expect(aa.refusedCalls(), "the proxy refused nothing").toHaveLength(0);
      expect(await seenText.matching(/Free gas is unavailable/)).toEqual([]);

      // The badge is on chain, created by the Light Account.
      const created = (await badgesCreatedBy(chain, me.address)).filter((event) => event.args.name === name);
      expect(created).toHaveLength(1);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Badge created successfully" });
    },
  );

  test(
    "I12: the second badge is not free: no notice, and the wallet pays through the Society account",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, context, wallet, aa, chain, subgraph }) => {
      await enableFreeFirstBadge(context);
      const me = await persona("fundedMember");
      // Its first badge, made before the page is opened. The subgraph fake
      // follows the chain, so the app's check finds it there.
      await chain.createBadge({ creator: me.address, name: `E2E Earlier ${me.address.slice(2, 8)}`, uri: "" });
      await expect
        .poll(async () => (await subgraph.entities("Badge")).filter((badge) => badge.creatorAddress === me.address.toLowerCase()).length)
        .toBeGreaterThan(1);
      const name = `E2E Second Badge ${me.address.slice(2, 8)}`;

      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(name);
      await expect(pages.badgeCreate.finishButton).toBeEnabled();
      await expect(page.getByTestId(FREE_BADGE_NOTICE_TEST_ID)).toHaveCount(0);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.badgeCreate.finishButton.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge created successfully", {
        timeout: 60_000,
      });

      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);
    },
  );

  test(
    "I13: with the switch off a member's first badge is paid by the wallet, as before",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, page, wallet, aa, chain }) => {
      // No cookie: the server's SPONSOR_FIRST_BADGE is unset in the stack.
      const me = await persona("fundedMember");
      const statusResponse = await page.request.get(`/api/aa/first-badge?chainId=${CHAIN_ID}&sender=${me.address}`);
      expect(await statusResponse.json()).toEqual({ enabled: false, eligible: false, reason: "disabled" });

      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(`E2E Switch Off ${me.address.slice(2, 8)}`);
      await expect(pages.badgeCreate.finishButton).toBeEnabled();
      await expect(page.getByTestId(FREE_BADGE_NOTICE_TEST_ID)).toHaveCount(0);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await pages.badgeCreate.finishButton.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Badge created successfully", {
        timeout: 60_000,
      });
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.calls).toHaveLength(0);
    },
  );

  test(
    "I14: a badge created after the wizard said 'free', not yet in the subgraph, is noticed at Finish: the wallet pays",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, pages, page, context, wallet, aa, chain, subgraph }) => {
      await enableFreeFirstBadge(context);
      const me = await persona("fundedMember");
      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(`E2E Raced ${me.address.slice(2, 8)}`);
      await expect(page.getByTestId(FREE_BADGE_NOTICE_TEST_ID)).toBeVisible();

      // Meanwhile (another tab, another device) the account creates a badge,
      // while the subgraph is behind: only the chain knows. The check reads
      // the blocks the subgraph has not indexed from the node.
      await subgraph.setMeta({ stall: true });
      await chain.createBadge({ creator: me.address, name: `E2E Elsewhere ${me.address.slice(2, 8)}`, uri: "" });

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const payment = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.badgeCreate.finishButton.click();
      await payment.requested;
      // Finish asked again and was told no, so it never asked the proxy, and
      // there is no "free gas is unavailable" notice: the badge was simply
      // not free any more.
      expect(aa.calls).toHaveLength(0);
      await expect(pages.shell.sponsorshipFallbackNotice).toHaveCount(0);
      // Let the subgraph catch up so the app's wait for it can finish.
      await subgraph.unfreeze();
      payment.approve();

      await expect(pages.shell.transactionToast("success")).toHaveText("Badge created successfully", {
        timeout: 60_000,
      });
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
    },
  );

  test(
    "I15: when the proxy refuses the free badge after the wizard offered it, the wallet pays after the free-gas notice",
    { tag: ["@edge", "@owner-tx"] },
    async ({ persona, pages, page, context, wallet, aa, chain, api }) => {
      await enableFreeFirstBadge(context);
      const me = await persona("fundedMember");

      // Use up this visitor's free-badge signatures for the account (the
      // `api` fixture sends the same test IP as the page). The status route
      // does not count them, so the wizard still offers the free badge; the
      // proxy then refuses pm_getPaymasterData.
      const userOperation = unsignedUserOperation({
        sender: me.address,
        callData: freeBadgeCallData(`E2E Burned ${me.address.slice(2, 8)}`),
        nonce: toHex(await nextNonce(chain, me.address)),
      });
      for (let i = 0; i < FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY; i += 1) {
        const response = await api.post(AA_RPC_PATH, {
          headers: FIRST_BADGE_HEADER,
          data: {
            jsonrpc: "2.0",
            id: i + 1,
            method: "pm_getPaymasterData",
            params: [userOperation, ENTRY_POINT_ADDRESS, toHex(CHAIN_ID), {}],
          },
        });
        // The mock paymaster may or may not like an operation without gas
        // values; what matters is that the proxy let it through its own
        // checks and spent one of the account's free-badge signatures.
        const error = ((await response.json()) as { error?: { message: string } }).error;
        expect(Object.values(FIRST_BADGE_REASONS)).not.toContain(error?.message);
      }

      await pages.badgeCreate.open();
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(`E2E Refused ${me.address.slice(2, 8)}`);
      await expect(page.getByTestId(FREE_BADGE_NOTICE_TEST_ID)).toBeVisible();

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      const payment = wallet.holdNext("transaction");
      wallet.clearRequests();
      aa.clear();
      await pages.badgeCreate.finishButton.click();
      await payment.requested;
      await expect(pages.shell.sponsorshipFallbackNotice).toBeVisible();
      expect(aa.refusedCalls().map((call) => call.error?.message)).toEqual([
        "Daily free badge sponsorship limit reached",
      ]);
      payment.approve();

      await expect(pages.shell.transactionToast("success")).toHaveText("Badge created successfully", {
        timeout: 60_000,
      });
      // The user operation was never signed: the refusal came first.
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(aa.userOperations()).toHaveLength(0);
    },
  );

  test(
    "I16: a community badge is never the free badge",
    { tag: ["@edge"] },
    async ({ persona, pages, page, context }) => {
      await enableFreeFirstBadge(context);
      const me = await persona("communityManager");
      await pages.badgeCreate.openForCommunity(me.community!.id);
      await pages.shell.connect();
      await pages.badgeCreate.toPermissions(`E2E Community ${me.address.slice(2, 8)}`);
      await expect(pages.badgeCreate.finishButton).toBeEnabled();
      await expect(page.getByTestId(FREE_BADGE_NOTICE_TEST_ID)).toHaveCount(0);
    },
  );
});
