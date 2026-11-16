import { isAddressEqual, type Address } from "viem";
import { BADGES_ADDRESS, CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import {
  INVITE_CODE_LENGTH,
  acceptInviteOnChain,
  parseInviteCode,
  seedInvitation,
} from "../../support/builders/referrals";
import { ReferralsPage } from "../../support/pages/referrals";

const DAY_SECONDS = 24 * 60 * 60;

/** The EIP-712 request the wallet was asked to sign, as the app sent it. */
type TypedDataRequest = {
  domain: { name?: string; version?: string; chainId?: number | string; verifyingContract?: Address };
  primaryType: string;
  message: { inviter: string; invitee: string; nonce: string | number; expiry: string | number };
};

function typedDataOf(params: unknown): { signer: Address; typed: TypedDataRequest } {
  const [signer, payload] = params as [Address, string | TypedDataRequest];
  return { signer, typed: typeof payload === "string" ? (JSON.parse(payload) as TypedDataRequest) : payload };
}

test.describe("referral codes", () => {
  test(
    "E2: a member generates a code for an invitee's Society address with one typed-data signature of the wallet",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, context, wallet, aa, chain, subgraph }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const me = await persona("member");
      const invitee = await actor("new");

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      await expect(referrals.generated).toHaveCount(0);

      wallet.clearRequests();
      aa.clear();
      const startedAt = Math.floor(Date.now() / 1000);
      const code = await referrals.generateFor(invitee.address);
      const finishedAt = Math.floor(Date.now() / 1000);

      // The code: 149 bytes of lowercase hex that start with the inviter. The
      // inviter is the WALLET, not the Society address: the contract recovers
      // it from an ECDSA signature, which only the wallet key can make.
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      expect(code).toMatch(/^0x[0-9a-f]+$/);
      const invite = parseInviteCode(code);
      expect(invite.inviter).toBe(me.ownerAddress.toLowerCase());
      expect(isAddressEqual(me.ownerAddress, me.address)).toBe(false);
      await expect(referrals.generateButton).toHaveCount(0);

      // It expires 24 hours after it was signed, and the page says on which day.
      expect(Number(invite.expiry)).toBeGreaterThanOrEqual(startedAt + DAY_SECONDS);
      expect(Number(invite.expiry)).toBeLessThanOrEqual(finishedAt + DAY_SECONDS);
      const expiryDay = await page.evaluate(
        (seconds) =>
          new Date(seconds * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
        Number(invite.expiry),
      );
      await expect(referrals.generatedExpiry).toHaveText(`Expires ${expiryDay}`);

      // The wallet was asked for exactly one typed-data signature, of the
      // badges contract's Invite message for this invitee, and for nothing
      // that costs gas. Nothing went to the account-abstraction proxy.
      expect(wallet.signatureRequests().map((request) => `${request.method}:${request.outcome}`)).toEqual([
        "eth_signTypedData_v4:ok",
      ]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(wallet.sendCallsRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
      const { signer, typed } = typedDataOf(wallet.signatureRequests()[0].params);
      expect(isAddressEqual(signer, me.ownerAddress)).toBe(true);
      expect(typed.primaryType).toBe("Invite");
      expect(Number(typed.domain.chainId)).toBe(CHAIN_ID);
      expect(isAddressEqual(typed.domain.verifyingContract!, BADGES_ADDRESS)).toBe(true);
      expect(typed.message.inviter.toLowerCase()).toBe(me.ownerAddress.toLowerCase());
      expect(typed.message.invitee.toLowerCase()).toBe(invitee.address.toLowerCase());
      expect(BigInt(typed.message.nonce)).toBe(invite.nonce);
      expect(BigInt(typed.message.expiry)).toBe(invite.expiry);

      // Copy puts the whole code on the clipboard.
      await referrals.copyCodeButton.click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(code);
      await expect(pages.shell.toast("error")).toHaveCount(0);

      // Generating wrote nothing: the nonce is unused and nobody is invited yet.
      expect(await chain.read("usedNonces", [me.ownerAddress, invite.nonce])).toBe(false);
      expect(await chain.read("hasInvited", [me.ownerAddress, invitee.address])).toBe(false);

      // And the code is good: the contract accepts it from the invitee it was
      // made for (sent here without the UI), and records the wallet as inviter.
      await acceptInviteOnChain({ chain, subgraph }, { invite, invitee });
      expect(await chain.read("hasInvited", [me.ownerAddress, invitee.address])).toBe(true);
      expect(await chain.read("usedNonces", [me.ownerAddress, invite.nonce])).toBe(true);
    },
  );

  test(
    "E3: no code for one's own wallet or Society address, or for something that is not an address",
    { tag: ["@core"] },
    async ({ persona, pages, page, wallet }) => {
      const me = await persona("member");
      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      wallet.clearRequests();

      const own = "You cannot generate a referral code for your own address";

      await referrals.addressInput.fill(me.ownerAddress);
      await expect(referrals.addressMessage(own)).toBeVisible();
      await expect(referrals.generateButton).toBeDisabled();

      await referrals.addressInput.fill("0x1234");
      await expect(referrals.addressMessage("Invalid address")).toBeVisible();
      await expect(referrals.addressMessage(own)).toHaveCount(0);
      await expect(referrals.generateButton).toBeDisabled();

      await referrals.addressInput.fill(me.address);
      await expect(referrals.addressMessage(own)).toBeVisible();
      await expect(referrals.generateButton).toBeDisabled();

      // Case does not get around it.
      await referrals.addressInput.fill(me.address.toLowerCase());
      await expect(referrals.addressMessage(own)).toBeVisible();
      await expect(referrals.generateButton).toBeDisabled();

      await expect(referrals.generated).toHaveCount(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
    },
  );

  test(
    "E3: no code for the wallet that referred you, or for an address that was already referred",
    { tag: ["@core"] },
    async ({ persona, actor, pages, page, wallet, chain, subgraph }) => {
      const referrer = await actor("member");
      const me = await persona("member");
      const invitedByMe = await actor("new");
      const invitedByReferrer = await actor("new");
      // referrer -> me, me -> invitedByMe, referrer -> invitedByReferrer.
      // Three different accounts accept, so the chain takes them in any order.
      await Promise.all([
        seedInvitation({ chain, subgraph }, { inviter: referrer, invitee: me }),
        seedInvitation({ chain, subgraph }, { inviter: me, invitee: invitedByMe }),
        seedInvitation({ chain, subgraph }, { inviter: referrer, invitee: invitedByReferrer }),
      ]);
      // An inviter is a wallet, so "referred by" is the referrer's wallet address.
      expect((await subgraph.entity("User", me.address))?.invitedBy).toBe(referrer.ownerAddress.toLowerCase());

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      wallet.clearRequests();

      // The one who referred me.
      await referrals.addressInput.fill(referrer.ownerAddress);
      await expect(
        referrals.addressMessage("You cannot generate a referral code for the address that referred you"),
      ).toBeVisible();
      await expect(referrals.generateButton).toBeDisabled();

      // Someone I referred myself.
      await referrals.addressInput.fill(invitedByMe.address);
      await expect(referrals.addressMessage("This address was already referred by you")).toBeVisible();
      await expect(referrals.generateButton).toBeDisabled();

      // Someone another member referred: the message names the referrer.
      await referrals.addressInput.fill(invitedByReferrer.address);
      await expect(
        referrals.addressMessage(`This address was already referred by ${referrer.ownerAddress.toLowerCase()}`),
      ).toBeVisible();
      await expect(referrals.generateButton).toBeDisabled();

      await expect(referrals.generated).toHaveCount(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
    },
  );

  test(
    "E9: declining the signature shows an error and no code; the next attempt works",
    { tag: ["@edge"] },
    async ({ persona, actor, pages, page, wallet, aa }) => {
      await persona("member");
      const invitee = await actor("new");
      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();

      await referrals.addressInput.fill(invitee.address);
      await expect(referrals.generateButton).toBeEnabled();
      wallet.clearRequests();
      aa.clear();
      wallet.rejectNextSignature();
      await referrals.generateButton.click();

      await expect(pages.shell.toast("error")).toHaveText("User rejected the request.");
      await expect(referrals.generated).toHaveCount(0);
      await expect(referrals.generatedCode).toHaveCount(0);
      // The form is as it was: the invitee is still there and Generate can be pressed again.
      await expect(referrals.addressInput).toHaveValue(invitee.address);
      await expect(referrals.generateButton).toBeEnabled();
      expect(wallet.signatureRequests().map((request) => `${request.method}:${request.outcome}`)).toEqual([
        "eth_signTypedData_v4:rejected",
      ]);

      await referrals.generateButton.click();
      await expect(referrals.generatedCode).toBeVisible();
      expect(wallet.signatureRequests().map((request) => request.outcome)).toEqual(["rejected", "ok"]);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(aa.userOperations()).toHaveLength(0);
    },
  );

  test(
    "E10: a generated code is shown for three minutes and then gives way to Generate again",
    { tag: ["@edge"] },
    async ({ persona, actor, pages, page, wallet }) => {
      // The page's clock is ours from the start; until it is moved, time runs as usual.
      await page.clock.install();
      await persona("member");
      const invitee = await actor("new");
      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();

      wallet.clearRequests();
      const code = await referrals.generateFor(invitee.address);

      // Ten seconds before the three minutes are over it is still there.
      await page.clock.fastForward(170_000);
      await expect(referrals.generatedCode).toHaveText(code);

      await page.clock.fastForward(11_000);
      await expect(referrals.generated).toHaveCount(0);
      await expect(referrals.generatedCode).toHaveCount(0);
      // The invitee stays in the field, so a new code is one click away.
      await expect(referrals.addressInput).toHaveValue(invitee.address);
      await expect(referrals.generateButton).toBeEnabled();
      expect(wallet.signatureRequests()).toHaveLength(1);
    },
  );

  test(
    "E10: a generated code is not shown for another address",
    { tag: ["@edge"] },
    async ({ persona, actor, pages, page, wallet }) => {
      await persona("member");
      const invitee = await actor("new");
      const someoneElse = await actor("new");
      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();

      wallet.clearRequests();
      const code = await referrals.generateFor(invitee.address);
      await expect(referrals.generatedCode).toHaveText(code);

      // The code was signed for one invitee. With another address in the
      // field it is gone, and Generate is offered for the new address.
      await referrals.addressInput.fill(someoneElse.address);
      await expect(referrals.generated).toHaveCount(0);
      await expect(referrals.generatedCode).toHaveCount(0);
      await expect(referrals.generateButton).toBeEnabled();

      // An empty field shows no code either.
      await referrals.addressClearButton.click();
      await expect(referrals.addressInput).toHaveValue("");
      await expect(referrals.generated).toHaveCount(0);
      await expect(referrals.generateButton).toBeDisabled();

      // Changing the address asked the wallet for nothing more.
      expect(wallet.signatureRequests()).toHaveLength(1);
    },
  );
});
