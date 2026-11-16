import type { APIRequestContext } from "@playwright/test";
import { isAddressEqual } from "viem";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test, type Persona } from "../../fixtures";
import { REFUSALS } from "../../support/aa/refusals";
import {
  AA_RPC_PATH,
  fromIp,
  newAccountProfileOperation,
  paymasterDataCall,
  paymasterStubCall,
  type JsonRpcReply,
} from "../../support/aa/requests";
import { badgesCallOf, deploysSender, type AaTraffic } from "../../support/aa/traffic";
import type { Chain } from "../../support/chain/chain";
import { reachReview } from "../../support/flows/onboarding";
import type { Pages } from "../../support/pages";
import type { SeenText } from "../../support/seen-text";
import type { TestWallet } from "../../support/wallet/test-wallet";
import {
  amountNamed,
  expectNeverAskedToFundSocietyAccount,
  expectOwnerPaidThroughAccount,
  expectSponsoredThroughAccount,
} from "../../support/write-route";

/**
 * The limits on sponsored account creation (src/lib/aa/rate-limit.ts):
 * SPONSORED_PROFILES_PER_IP_PER_DAY (default 1) and
 * SPONSORED_PROFILE_INTERVAL_SECONDS (default 300, app-wide). Past either,
 * the proxy refuses the call that would have the paymaster sign, which
 * comes before the wallet signs the user operation, so the app sends the
 * profile paid by the owner wallet instead.
 *
 * The stack's app has both limits off (e2e/support/stack/config.mjs): they
 * would refuse most tests that create a profile. Every test here runs on a
 * second app server of its own with real values (`appEnv`, see
 * e2e/support/app-variant.ts), so its counts start empty. Nothing is
 * stubbed: every refusal is the real proxy's.
 */

/**
 * Someone else creates a new account through the proxy, from `ip`, the way
 * the app asks: the stub call, then the signing call. The paymaster signs;
 * nothing is sent. That is enough to use the allowance (see DEPLOYMENT.md,
 * "Sponsorship limits").
 */
async function anotherNewAccountFrom(
  { api, chain, nextAccount }: { api: APIRequestContext; chain: Chain; nextAccount: () => { address: `0x${string}` } },
  ip: string,
) {
  const owner = nextAccount().address;
  const operation = newAccountProfileOperation(owner, chain.societyAddress(owner));
  for (const body of [paymasterStubCall(operation), paymasterDataCall(operation)]) {
    const reply = (await (await api.post(AA_RPC_PATH, { data: body, headers: fromIp(ip) })).json()) as JsonRpcReply;
    expect(reply.error, `${body.method} for the earlier account`).toBeUndefined();
  }
}

/**
 * From the review step, with the proxy about to refuse the profile's
 * sponsorship with `refusal`: Finish; the wallet first deploys the Light
 * Account, then sends createProfile through it, both paid by the owner
 * wallet after the fallback notice. The same route as O11, without a stub.
 */
async function finishPaidByWallet(
  { pages, wallet, aa, chain, seenText }: { pages: Pages; wallet: TestWallet; aa: AaTraffic; chain: Chain; seenText: SeenText },
  me: Persona,
  refusal: { code: number; message: string },
) {
  const ownerBalanceBefore = await chain.balance(me.ownerAddress);
  expect(await chain.isContract(me.address), "the Light Account is not deployed").toBe(false);
  const setUp = wallet.holdNext("transaction");
  const action = wallet.holdNext("transaction");
  wallet.clearRequests();
  aa.clear();
  await pages.onboarding.submit();

  await setUp.requested;
  await expect(pages.shell.sponsorshipFallbackNotice).toHaveText(
    /^Free gas is unavailable right now, so your wallet will pay the network fee for this action \(about [\d.]+ ETH\)\. Confirm two transactions in your wallet: one sets up your Society account, the next sends the action\.$/,
  );
  const announced = amountNamed(await pages.shell.sponsorshipFallbackNotice.innerText());
  // What the proxy answered the page: the stub call was served, the call
  // that signs the sponsorship was refused by the limit. (viem's transport
  // repeats a call answered with -32005, "limit exceeded", up to three
  // times before the app sees the error, so the refusal comes one to four
  // times.)
  const refused = aa.refusedCalls();
  expect(refused.length).toBeGreaterThanOrEqual(1);
  expect(refused.length).toBeLessThanOrEqual(4);
  for (const call of refused) {
    expect({ method: call.method, error: call.error }).toEqual({ method: "pm_getPaymasterData", error: refusal });
  }
  expect(aa.paymasterCalls().filter((call) => call.method === "pm_getPaymasterStubData")).toHaveLength(1);
  setUp.approve();

  await action.requested;
  action.approve();
  await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
  await expect(pages.shell.toast("error")).toHaveCount(0);
  await expect(pages.profile.details).toContainText("Onboarding Test");

  // One signature (the upload authentication), two transactions paid by
  // the wallet, no user operation.
  const receipt = await expectOwnerPaidThroughAccount(
    { wallet, chain },
    { persona: me, ownerBalanceBefore, signatures: 1, deploysAccount: true },
  );
  expect(receipt.status).toBe("success");
  expect(aa.userOperations()).toHaveLength(0);
  expect(ownerBalanceBefore - (await chain.balance(me.ownerAddress))).toBeLessThanOrEqual(announced);

  // The profile is the Light Account's, as when it is sponsored.
  const badgeId = await chain.profileBadgeId(me.address);
  expect(badgeId).toBeGreaterThan(BigInt(0));
  expect(await chain.badgeBalance(me.address, badgeId)).toBe(BigInt(1));
  expect(await chain.profileBadgeId(me.ownerAddress)).toBe(BigInt(0));
  await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Free gas is unavailable right now" });
}

test.describe("sponsored profile creation under the default limits", () => {
  test.use({ appEnv: { SPONSORED_PROFILES_PER_IP_PER_DAY: "1", SPONSORED_PROFILE_INTERVAL_SECONDS: "300" } });

  test(
    "C17: a visitor's first new account of the day is sponsored under the default limits",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, pages, wallet, aa, chain }) => {
      const me = await reachReview({ persona, pages, kind: "new" });
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));

      wallet.clearRequests();
      aa.clear();
      await pages.onboarding.submit();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.profile.details).toContainText("Onboarding Test");
      await expect(pages.shell.sponsorshipFallbackNotice).toHaveCount(0);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The whole send asked the paymaster to sign once, and was not refused.
      expect(aa.refusedCalls()).toEqual([]);
      expect(aa.paymasterCalls().filter((call) => call.method === "pm_getPaymasterData")).toHaveLength(1);
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 2 },
      );
      expect(deploysSender(userOperation)).toBe(true);
      const call = badgesCallOf(userOperation);
      expect(isAddressEqual(call.to, BADGES_ADDRESS)).toBe(true);
      expect(call.functionName).toBe("createProfile");
      expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
    },
  );
});

test.describe("sponsored profile creation past the daily limit of a visitor", () => {
  test.use({ appEnv: { SPONSORED_PROFILES_PER_IP_PER_DAY: "1", SPONSORED_PROFILE_INTERVAL_SECONDS: "0" } });

  test(
    "C18: a second new account from the same IP on the same day is refused sponsorship, and the wallet pays",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, chain, seenText, api, nextAccount, testIp }) => {
      // Earlier today this visitor (the browser's IP) made another account.
      await anotherNewAccountFrom({ api, chain, nextAccount }, testIp);

      const me = await reachReview({ persona, pages, kind: "newFunded" });
      await finishPaidByWallet({ pages, wallet, aa, chain, seenText }, me, REFUSALS.dailyProfileCreateLimit.error);
    },
  );
});

test.describe("sponsored profile creation inside the app-wide interval", () => {
  test.use({ appEnv: { SPONSORED_PROFILES_PER_IP_PER_DAY: "0", SPONSORED_PROFILE_INTERVAL_SECONDS: "300" } });

  test(
    "C19: a new account from another IP inside the app-wide interval is refused sponsorship too, and the wallet pays",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, pages, wallet, aa, chain, seenText, api, nextAccount }) => {
      // A moment ago someone else, from another IP, made an account.
      await anotherNewAccountFrom({ api, chain, nextAccount }, "198.51.100.40");

      const me = await reachReview({ persona, pages, kind: "newFunded" });
      await finishPaidByWallet({ pages, wallet, aa, chain, seenText }, me, REFUSALS.appProfileCreateLimit.error);
    },
  );
});
