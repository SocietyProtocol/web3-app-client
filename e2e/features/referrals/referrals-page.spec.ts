import { expect, test } from "../../fixtures";
import { signInvite } from "../../support/builders/referrals";
import { ReferralsPage } from "../../support/pages/referrals";

test.describe("referrals page", () => {
  test(
    "E1: /referrals shows the intro, both forms and the FAQ to a visitor without a wallet",
    { tag: ["@smoke"] },
    async ({ page, wallet }) => {
      const referrals = new ReferralsPage(page);
      await referrals.open();

      await expect(referrals.heading).toBeVisible();
      await expect(page.getByText("Invite trusted members and accept invitations on-chain.")).toBeVisible();

      // The intro (src/copywriting/Referral Program Intro.md, served by /api/copywriting).
      await expect(page.getByRole("heading", { name: "How it works", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Generate a referral code", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Accept an invitation", exact: true })).toBeVisible();

      // Both forms are there, and neither can be used without a wallet.
      await expect(referrals.codeInput).toBeVisible();
      await expect(referrals.codeInput).toHaveValue("");
      await expect(referrals.acceptButton).toBeDisabled();
      await expect(referrals.addressInput).toBeVisible();
      await expect(referrals.addressInput).toHaveValue("");
      await expect(referrals.generateButton).toBeDisabled();
      await expect(referrals.generated).toHaveCount(0);

      // The FAQ (src/copywriting/Referral Program FAQ.md): questions that open their answer.
      await expect(page.getByRole("heading", { name: "FAQ", exact: true })).toBeVisible();
      const question = referrals.faqQuestion("Do referral codes expire?");
      const answer = page.getByText(/Each referral code is valid for/);
      await expect(question).toBeVisible();
      await expect(question).toHaveAttribute("aria-expanded", "false");
      await expect(answer).toBeHidden();
      await question.click();
      await expect(question).toHaveAttribute("aria-expanded", "true");
      await expect(answer).toBeVisible();
      await expect(referrals.faqQuestion("Can I accept more than one referral code?")).toBeVisible();

      // Reading the page asks the wallet for nothing.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );

  test(
    "E4: Paste fills each field from the clipboard, trimmed, and Clear empties it again",
    { tag: ["@edge"] },
    async ({ persona, pages, page, context, chain, wallet, nextAccount }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const me = await persona("member");
      const invitee = chain.societyAddress(nextAccount().address);
      // A real invitation for this member from a wallet nobody knows. Signing it writes nothing.
      const invite = await signInvite(chain, { inviter: nextAccount(), invitee: me.address });

      const referrals = new ReferralsPage(page);
      await referrals.open();
      await pages.shell.connect();
      const copy = (text: string) => page.evaluate((value) => navigator.clipboard.writeText(value), text);

      // The invitee field of the generator. An empty field offers Paste, a filled one Clear.
      await expect(referrals.addressInput).toHaveValue("");
      await expect(referrals.addressClearButton).toHaveCount(0);
      await copy(`  ${invitee}\n`);
      await referrals.addressPasteButton.click();
      await expect(referrals.addressInput).toHaveValue(invitee);
      await expect(referrals.addressPasteButton).toHaveCount(0);
      // What was pasted is validated like typed text: the address is fine, so Generate is offered.
      await expect(referrals.generateButton).toBeEnabled();
      await referrals.addressClearButton.click();
      await expect(referrals.addressInput).toHaveValue("");
      await expect(referrals.addressPasteButton).toBeVisible();
      await expect(referrals.addressClearButton).toHaveCount(0);
      await expect(referrals.generateButton).toBeDisabled();

      // The code field of the accept form.
      await expect(referrals.codeInput).toHaveValue("");
      await expect(referrals.codeClearButton).toHaveCount(0);
      await copy(`\n ${invite.code}  `);
      await referrals.codePasteButton.click();
      await expect(referrals.codeInput).toHaveValue(invite.code);
      await expect(referrals.codePasteButton).toHaveCount(0);
      // Validated as well: this code is acceptable, so the button becomes available.
      await expect(referrals.acceptButton).toBeEnabled();
      await referrals.codeClearButton.click();
      await expect(referrals.codeInput).toHaveValue("");
      await expect(referrals.codePasteButton).toBeVisible();
      await expect(referrals.codeClearButton).toHaveCount(0);
      await expect(referrals.acceptButton).toBeDisabled();

      // Pasting and clearing ask the wallet for nothing and leave no error behind.
      await expect(pages.shell.toast("error")).toHaveCount(0);
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    },
  );
});
