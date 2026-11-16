import { isAddressEqual, type Address, type Hex } from "viem";
import { BADGES_ADDRESS } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { badgesCallOf, deploysSender } from "../../support/aa/traffic";
import {
  encodeInviteCode,
  inviteExpiry,
  seedInvitation,
  signInvite,
  type Invite,
} from "../../support/builders/referrals";
import { ReferralsPage } from "../../support/pages/referrals";
import { expectNeverAskedToFundSocietyAccount, expectSponsoredThroughAccount } from "../../support/write-route";

/** "0x1234...abcdef", the way the app shortens an address. */
function shortened(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/** The user operation called acceptInvite on the badges contract with exactly this invitation. */
function expectAcceptInviteCall(call: ReturnType<typeof badgesCallOf>, invite: Invite) {
  expect(isAddressEqual(call.to, BADGES_ADDRESS)).toBe(true);
  expect(call.functionName).toBe("acceptInvite");
  expect(call.value).toBe(BigInt(0));
  const [inviter, nonce, expiry, signature] = call.args as [Address, bigint, bigint, Hex];
  expect(isAddressEqual(inviter, invite.inviter)).toBe(true);
  expect(nonce).toBe(invite.nonce);
  expect(expiry).toBe(invite.expiry);
  expect(signature.toLowerCase()).toBe(invite.signature.toLowerCase());
}

test.describe("accepting an invitation", () => {
  test(
    "E5: a member accepts an invitation with sponsored gas; the profile then names the referrer and the accept form is gone",
    { tag: ["@smoke", "@sponsored"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, subgraph, seenText }) => {
      const inviter = await actor("member");
      const me = await persona("member");
      // The inviter's wallet signs an invitation for my Society address. Nothing is on chain yet.
      const invite = await signInvite(chain, { inviter: inviter.owner, invitee: me.address });
      expect(await chain.read("hasInvited", [inviter.ownerAddress, me.address])).toBe(false);

      // The profile says so, and leads to the referrals page.
      await pages.profile.open();
      await pages.shell.connect();
      await expect(pages.profile.details.getByText("Not referred by anyone")).toBeVisible();
      await pages.profile.details.getByRole("link", { name: "Manage referrals" }).click();
      await expect(page).toHaveURL(/\/referrals$/);

      const referrals = new ReferralsPage(page);
      await referrals.codeInput.fill(invite.code);
      await expect(referrals.acceptButton).toBeEnabled();
      await expect(referrals.simulationError).toHaveCount(0);

      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      aa.clear();
      await referrals.acceptButton.click();

      // The app reports success, and the accept form goes away: an account is
      // referred once. Generating codes stays possible.
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.transactionToast("success")).toContainText("Invitation accepted successfully");
      await expect(referrals.acceptForm).toHaveCount(0);
      await expect(referrals.addressInput).toBeVisible();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // The wallet signed one user operation and sent nothing; Society paid.
      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore, signatures: 1 },
      );
      expectAcceptInviteCall(badgesCallOf(userOperation), invite);
      expect(deploysSender(userOperation)).toBe(false);

      // On chain the inviter's wallet has invited my Society address, and the
      // invitation cannot be used again.
      expect(await chain.read("hasInvited", [inviter.ownerAddress, me.address])).toBe(true);
      expect(await chain.read("usedNonces", [inviter.ownerAddress, invite.nonce])).toBe(true);
      const invitees = await chain.read("getInvitees", [inviter.ownerAddress]);
      expect(invitees.some((invitee) => isAddressEqual(invitee, me.address))).toBe(true);
      expect(await chain.read("hasInvited", [inviter.ownerAddress, me.ownerAddress])).toBe(false);
      expect((await subgraph.entity("User", me.address))?.invitedBy).toBe(inviter.ownerAddress.toLowerCase());

      // Back on the profile, "Referred by" names the inviter. The contract
      // knows an inviter by the wallet that signed, so that is the address shown.
      await referrals.backButton.click();
      await expect(page).toHaveURL(/\/profile/);
      await expect(pages.profile.details).toBeVisible();
      await expect(pages.profile.details.getByText("Not referred by anyone")).toHaveCount(0);
      const referredBy = pages.profile.details.getByRole("link", {
        name: `User profile link for ${shortened(inviter.ownerAddress.toLowerCase())}`,
      });
      await expect(referredBy).toBeVisible();
      await expect(referredBy).toHaveAttribute("href", `/user/${inviter.ownerAddress.toLowerCase()}`);

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Invitation accepted successfully" });
    },
  );

  test(
    "E5: a wallet without a profile accepts an invitation; the sponsored operation also deploys its Society account",
    { tag: ["@core", "@sponsored"] },
    async ({ persona, actor, pages, page, wallet, aa, chain, subgraph, seenText }) => {
      const inviter = await actor("member");
      const me = await persona("new");
      const invite = await signInvite(chain, { inviter: inviter.owner, invitee: me.address });
      expect(await chain.balance(me.ownerAddress)).toBe(BigInt(0));
      expect(await chain.isContract(me.address)).toBe(false);

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      await referrals.codeInput.fill(invite.code);
      await expect(referrals.acceptButton).toBeEnabled();

      wallet.clearRequests();
      aa.clear();
      await referrals.acceptButton.click();

      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });
      await expect(pages.shell.transactionToast("success")).toContainText("Invitation accepted successfully");
      await expect(referrals.acceptForm).toHaveCount(0);
      await expect(referrals.addressInput).toBeVisible();
      await expect(pages.shell.toast("error")).toHaveCount(0);

      const userOperation = await expectSponsoredThroughAccount(
        { wallet, aa, chain },
        { persona: me, ownerBalanceBefore: BigInt(0), signatures: 1 },
      );
      expectAcceptInviteCall(badgesCallOf(userOperation), invite);
      expect(deploysSender(userOperation)).toBe(true);

      // The invitee is the Society address, which now exists on chain. It
      // still has no profile: accepting an invitation does not make one.
      expect(await chain.isContract(me.address)).toBe(true);
      expect(await chain.read("hasInvited", [inviter.ownerAddress, me.address])).toBe(true);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
      expect((await subgraph.entity("User", me.address))?.invitedBy).toBe(inviter.ownerAddress.toLowerCase());

      await expectNeverAskedToFundSocietyAccount(seenText, me, { saw: "Invitation accepted successfully" });
    },
  );

  test(
    "E6: a code that is not a referral code, or one's own code, is refused before anything is sent",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet, aa, chain, nextAccount }) => {
      const me = await persona("member");
      const stranger = chain.societyAddress(nextAccount().address);
      // My own code: I am its inviter, by my wallet, as the generator makes them.
      const mine = await signInvite(chain, { inviter: me.owner, invitee: stranger });
      // The same with my Society address in the inviter's place.
      const mineBySocietyAddress = encodeInviteCode({ ...mine, inviter: me.address });

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      wallet.clearRequests();
      aa.clear();

      const badFormat = "Invalid referral code format.";
      const ownCode = "You cannot use your own referral code.";

      await referrals.codeInput.fill("not a referral code");
      await expect(referrals.codeMessage(badFormat)).toBeVisible();
      await expect(referrals.acceptButton).toBeDisabled();

      await referrals.codeInput.fill(mine.code);
      await expect(referrals.codeMessage(ownCode)).toBeVisible();
      await expect(referrals.codeMessage(badFormat)).toHaveCount(0);
      await expect(referrals.acceptButton).toBeDisabled();

      // Hex, but one byte short of a code.
      await referrals.codeInput.fill(mine.code.slice(0, -2));
      await expect(referrals.codeMessage(badFormat)).toBeVisible();
      await expect(referrals.codeMessage(ownCode)).toHaveCount(0);
      await expect(referrals.acceptButton).toBeDisabled();

      await referrals.codeInput.fill(mineBySocietyAddress);
      await expect(referrals.codeMessage(ownCode)).toBeVisible();
      await expect(referrals.acceptButton).toBeDisabled();

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
    },
  );

  test(
    "E6: a code from someone you invited is refused",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet, chain, subgraph }) => {
      const friend = await actor("member");
      const me = await persona("member");
      // I invited the friend, who accepted. Now the friend sends me a code.
      await seedInvitation({ chain, subgraph }, { inviter: me, invitee: friend });
      expect(await chain.read("hasInvited", [me.ownerAddress, friend.address])).toBe(true);
      const fromFriend = await signInvite(chain, { inviter: friend.owner, invitee: me.address });

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      wallet.clearRequests();
      await referrals.codeInput.fill(fromFriend.code);

      // An invitation is recorded as hasInvited[inviter's WALLET][invitee's
      // SOCIETY ADDRESS]. The contract's own CircularInvitation check reads
      // hasInvited[caller][code's inviter], a pair that never exists for
      // Light Accounts, so only the app's guard stops this one.
      await expect(
        referrals.codeMessage("You cannot use a referral code from someone you have already invited."),
      ).toBeVisible();
      await expect(referrals.acceptButton).toBeDisabled();
    },
  );

  test(
    "E7: a code signed for another invitee fails the simulation as an invalid signature and cannot be sent",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet, aa, chain }) => {
      const inviter = await actor("member");
      const me = await persona("member");
      const intended = await actor("new");
      // A good invitation, for someone else. The code does not name its invitee:
      // only the contract can tell, by recovering the signer for the caller.
      const invite = await signInvite(chain, { inviter: inviter.owner, invitee: intended.address });

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      wallet.clearRequests();
      aa.clear();
      await referrals.codeInput.fill(invite.code);

      await expect(referrals.simulationError).toHaveText("Invalid signature");
      await expect(referrals.acceptButton).toBeDisabled();
      // The format is fine, so there is no message under the field.
      await expect(referrals.codeMessage("Invalid referral code format.")).toHaveCount(0);

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("hasInvited", [inviter.ownerAddress, me.address])).toBe(false);
    },
  );

  test(
    "E7: an expired code fails the simulation and cannot be sent",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet, aa, chain }) => {
      const inviter = await actor("member");
      const me = await persona("member");
      // Signed for me, by a valid inviter, but its hour has passed.
      const invite = await signInvite(chain, {
        inviter: inviter.owner,
        invitee: me.address,
        expiry: inviteExpiry(-3600),
      });

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      wallet.clearRequests();
      aa.clear();
      await referrals.codeInput.fill(invite.code);

      // The contract reverts with SignatureExpired. The app has no wording of
      // its own for that error (src/utils/errors.ts), so the alert's text is
      // not pinned here: there is one, and it says something.
      await expect(referrals.simulationError).toBeVisible();
      await expect(referrals.simulationError).toHaveText(/\S/);
      await expect(referrals.acceptButton).toBeDisabled();

      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      expect(await chain.read("hasInvited", [inviter.ownerAddress, me.address])).toBe(false);
    },
  );

  test(
    "E8: a member who was already referred has no accept form, and can still generate codes",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet, chain, subgraph, nextAccount }) => {
      const referrer = await actor("member");
      const me = await persona("member");
      await seedInvitation({ chain, subgraph }, { inviter: referrer, invitee: me });
      expect((await subgraph.entity("User", me.address))?.invitedBy).toBe(referrer.ownerAddress.toLowerCase());

      const referrals = new ReferralsPage(page);
      await referrals.open();
      // A visitor without a wallet is offered both forms.
      await expect(referrals.acceptForm).toBeVisible();
      await pages.shell.connect();

      // connect() returns once the account's User query has loaded, which is
      // what the forms wait for: this is the settled state, not a loading one.
      await expect(referrals.acceptForm).toHaveCount(0);
      await expect(referrals.codeInput).toHaveCount(0);
      await expect(referrals.heading).toBeVisible();

      // The generator is there and takes an invitee.
      await expect(referrals.addressInput).toBeVisible();
      await referrals.addressInput.fill(chain.societyAddress(nextAccount().address));
      await expect(referrals.generateButton).toBeEnabled();
      await expect(referrals.acceptForm).toHaveCount(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
    },
  );
});
