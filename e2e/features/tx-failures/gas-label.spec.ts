import { randomBytes } from "node:crypto";
import type { Address, Hex } from "viem";
import { generateReferralCode } from "../../../src/utils/referralCode";
import { expect, test, type Persona } from "../../fixtures";
import { badgesCallOf } from "../../support/aa/traffic";
import type { Chain } from "../../support/chain/chain";
import { expectNeverAskedToFundSocietyAccount, expectSponsoredThroughAccount } from "../../support/write-route";

/**
 * O9, the part H1 and H11 do not cover: the gas label next to the button
 * of a write that Society sponsors. Only the accept-invitation form shows
 * a label for a sponsored write (the profile forms show none), so this is
 * that form. The label of a write the wallet pays for is in
 * features/badge-actions/mint-routing.spec.ts.
 */

const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * A referral code as the app's generator makes it
 * (src/components/ProfileDataCard/useGenerateReferralCode.ts): the inviter's
 * wallet signs an EIP-712 "Invite" for one invitee, and the code is
 * inviter | nonce | expiry | signature. The contract recovers the inviter
 * from the signature, so the inviter is the wallet, not its Society address.
 */
async function referralCodeFor(chain: Chain, inviter: Persona, invitee: Address): Promise<Hex> {
  const [, name, version, chainId, verifyingContract] = await chain.read("eip712Domain");
  const nonce = BigInt(`0x${randomBytes(32).toString("hex")}`);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + SECONDS_PER_DAY);
  const signature = await inviter.owner.signTypedData({
    domain: { name, version, chainId: Number(chainId), verifyingContract },
    types: {
      Invite: [
        { name: "inviter", type: "address" },
        { name: "invitee", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
    },
    primaryType: "Invite",
    message: { inviter: inviter.ownerAddress, invitee, nonce, expiry },
  });
  return generateReferralCode(signature, inviter.ownerAddress, nonce, expiry);
}

test.describe("the gas label", () => {
  test(
    "O9: a write that Society sponsors is labelled $0, also for a wallet that holds ETH, and it costs the wallet nothing",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, seenText }) => {
      const [me, inviter] = await Promise.all([persona("fundedMember"), actor("member")]);
      const code = await referralCodeFor(chain, inviter, me.address);
      expect(code).toHaveLength(300);

      const codeInput = page.getByPlaceholder("Paste or enter a referral code");
      const acceptButton = page.getByRole("button", { name: "Accept Invitation", exact: true });
      const gasLabel = page.getByTestId("transaction-gas-estimate");

      await page.goto("/referrals");
      await pages.shell.connect();

      // No label while there is nothing to send.
      await expect(codeInput).toHaveValue("");
      await expect(acceptButton).toBeDisabled();
      await expect(gasLabel).toHaveCount(0);

      // With a code that can be accepted, the button is usable and the
      // label says what it will cost the user: nothing.
      await codeInput.fill(code);
      await expect(acceptButton).toBeEnabled();
      await expect(gasLabel).toHaveText("$0");
      // Showing the price asked the wallet for nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);

      // The label is true: accepting takes one signature, Society's
      // paymaster pays, and the wallet's ETH is where it was.
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      expect(ownerBalanceBefore, "the wallet could have paid").toBeGreaterThan(BigInt(0));
      wallet.clearRequests();
      aa.clear();
      await acceptButton.click();
      await expect(pages.shell.transactionToast("success")).toHaveText("Invitation accepted successfully", {
        timeout: 60_000,
      });
      await expect(pages.shell.toast("error")).toHaveCount(0);

      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expect(badgesCallOf(userOperation).functionName).toBe("acceptInvite");
      // On chain the member, by its Society address, is now an invitee of the inviter's wallet.
      const invitees = await chain.read("getInvitees", [inviter.ownerAddress]);
      expect(invitees.map((invitee) => invitee.toLowerCase())).toEqual([me.address.toLowerCase()]);

      expect(await seenText.matching(/Free gas is unavailable|your wallet (will pay|pays)/i)).toEqual([]);
      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Invitation accepted successfully" });
    },
  );
});
