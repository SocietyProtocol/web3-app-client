import { isAddressEqual } from "viem";
import { SocietyVipManagerABI } from "../../../src/abis/SocietyVipManager";
import { expect, test } from "../../fixtures";
import {
  VIP_MANAGER_ADDRESS,
  currentLock,
  lockAs,
  lockParameters,
  specBalance,
  travelPast,
  unlockCall,
  unlocksIn,
} from "../../support/builders/lock-spec";
import { LockSpecPage } from "../../support/pages/lock-spec";
import { asked, expectNeverAskedToFundSocietyAccount, expectOwnerSentDirectly } from "../../support/write-route";
import { compactSpecAmount, shortDate } from "./steps";

/**
 * Claiming SPEC back after the lock has ended.
 *
 * THIS FILE MOVES THE CHAIN'S CLOCK FORWARD, by the shortest lock the VIP
 * manager takes (MIN_LOCK_DURATION), and the chain is never reverted. Every
 * block after it is that far in the future: for the rest of this run on the
 * same stack, and for later runs against a stack that was left running. So
 * it is a `*.timetravel.spec.ts` file: the `hermetic-timetravel` project
 * runs those after every other project. After it, sponsored writes on that
 * stack no longer work: the mock paymaster dates its sponsorship by the wall
 * clock (validUntil = now + its window), the chain's blocks are later than
 * that, so the bundle reverts and alto resubmits it for ever. That includes
 * this test's own persona seeding, so it cannot run twice on one stack
 * (--repeat-each, a retry): restart a stack that was left running after
 * this file ran on it.
 *
 * The page decides between "Locked" and "Claimable" by the BROWSER's clock
 * (useCurrentLock compares the unlock time with Date.now()), the contract
 * by the chain's. A real user has both in step, so the test moves both: the
 * chain with Anvil, the page with page.clock.
 */
test.describe("lock SPEC: after the lock has ended", () => {
  test(
    "N6: once the lock period is over the wallet claims its SPEC back with one transaction",
    { tag: ["@edge", "@owner-tx"] },
    async ({ page, persona, pages, wallet, aa, chain, subgraph, seenText }) => {
      const lockSpec = new LockSpecPage(page);
      const me = await persona("fundedMember");
      const tiers = await lockParameters(chain);
      // The wallet's lock: the bronze amount for the shortest time the contract takes.
      const lock = await lockAs(chain, me.ownerAddress, { amount: tiers.bronze, durationSeconds: tiers.minDuration });
      const specBefore = await specBalance(chain, me.ownerAddress);
      const lockedBefore = await specBalance(chain, VIP_MANAGER_ADDRESS);
      const unlockAsWallet = () =>
        chain.public.simulateContract({
          account: me.ownerAddress,
          address: VIP_MANAGER_ADDRESS,
          abi: SocietyVipManagerABI,
          functionName: "unlock",
        });
      // Before its end the contract refuses to give the SPEC back.
      await expect(unlockAsWallet(), "unlock() before the lock's end").rejects.toThrow();

      // The lock period passes: on chain, and on the user's device.
      const chainTime = await travelPast(chain, lock.unlockTime);
      await subgraph.sync();
      await unlockAsWallet();
      await page.clock.install({ time: new Date(Number(chainTime) * 1000) });
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);

      await lockSpec.open("claim");
      await pages.shell.connect();
      await expect(lockSpec.claim).toContainText(compactSpecAmount(lock.amount));
      await expect(lockSpec.claim).toContainText(shortDate(lock.unlockTime));
      await expect(lockSpec.claim.getByText("Claimable", { exact: true })).toBeVisible();
      await expect(lockSpec.claimSubmit).toHaveText(`CLAIM ${compactSpecAmount(lock.amount)}`);
      await expect(lockSpec.claimSubmit).toBeEnabled();
      await expect(lockSpec.simulationError).toHaveCount(0);

      wallet.clearRequests();
      aa.clear();
      await lockSpec.claimSubmit.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Transaction successful!", { timeout: 60_000 });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // One transaction and no signature, from the wallet straight to the
      // VIP manager: unlock().
      const receipt = await expectOwnerSentDirectly(
        { wallet, chain },
        { persona: me, to: VIP_MANAGER_ADDRESS, ownerBalanceBefore },
      );
      expect(asked(wallet.sendTransactionRequests()[0]).data?.toLowerCase()).toBe(unlockCall().toLowerCase());
      expect(aa.calls, "nothing was sent to the sponsorship proxy").toHaveLength(0);

      // On chain: the lock is gone and the SPEC is back on the wallet.
      const unlocked = unlocksIn(receipt);
      expect(unlocked).toHaveLength(1);
      expect(isAddressEqual(unlocked[0].user, me.ownerAddress), "unlocked for the wallet").toBe(true);
      expect(unlocked[0].amount).toBe(lock.amount);
      expect((await currentLock(chain, me.ownerAddress)).amount).toBe(BigInt(0));
      expect(await specBalance(chain, me.ownerAddress)).toBe(specBefore + lock.amount);
      expect(await specBalance(chain, VIP_MANAGER_ADDRESS)).toBe(lockedBefore - lock.amount);

      // The page: nothing is locked any more, and nothing is left to claim.
      await expect(lockSpec.claimSubmit).toHaveText("CLAIM SPEC");
      await expect(lockSpec.claimSubmit).toBeDisabled();
      await expect(lockSpec.claim).not.toContainText("Claimable");
      await expect(lockSpec.claim).toContainText("0 SPEC");

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Transaction successful!" });
    },
  );
});
