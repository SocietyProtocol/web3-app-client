# Invites and referrals: scenarios

One row per scenario. A test's title starts with the row's ID. Add a row here in the same pull
request that adds the feature or the test, and fill in the "Test" column when the row is automated.

- **Persona:** LO logged out, NEW fresh wallet without a profile, MEM member with a profile, LEG legacy
  wallet, MGR community manager, BM badge minter / burner / transferer, OBC official badge creator,
  GOV Governor badge holder, CW contract wallet. See `e2e/support/personas.ts` for what exists.
- **Needs:** W wallet connected, S signature, U sponsored user operation, T wallet transaction,
  R role, G subgraph, C chain read, I IPFS pin. (UF, "the Light Account pays its own gas", no longer
  exists: such writes are now paid by the owner wallet through the account, which is a T.)
- **Tag:** `@smoke`, `@core` or `@edge`.

The rows were imported from the planning inventory, which was read from the app before the
owner-pays routing change. Rows marked "review" describe the old behaviour ("needs ~X ETH",
a self-funded user operation): re-read `src/lib/outpost-routing.ts` before automating them.

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| E1 | /referrals renders intro, forms and FAQ | LO | – | @smoke | `referrals-page.spec.ts` |
| E2 | Generate a code for an invitee's Society address: one typed-data signature by the EOA, 300-character code, expiry, copy | MEM | W S C | @core | `referral-codes.spec.ts`. Also has the invitee accept the generated code on chain, without the UI |
| E3 | Generate validation: own wallet or Society address, the address that referred you, "already referred by …" | MEM | W G | @core | `referral-codes.spec.ts`: two tests. "The address that referred you" is the referrer's wallet, because an inviter is always a wallet |
| E4 | Paste and Clear buttons | MEM | W | @edge | `referrals-page.spec.ts`, both fields |
| E5 | Accept invite end to end: paste code, sponsored `acceptInvite`, "Invitation Accepted!", "Referred by" updates, accept form disappears | NEW/MEM | W S U G | @smoke | `accept-invite.spec.ts`: two tests, a member (`@smoke`) and a wallet without a profile (`@core`). "Invitation Accepted!" on the button is not asserted: the form unmounts when the User query is refetched, at the moment the write succeeds; the tests assert the toast "Invitation accepted successfully" instead |
| E6 | Accept validation: bad format, own code, code from someone you invited | MEM | W C | @core | `accept-invite.spec.ts`: two tests. "Code from someone you invited" is an **expected failure**: the guard asks `hasInvited(my Society address, the inviter's wallet)`, a pair that never exists on chain, so the circular invitation is not refused (app and contract) |
| E7 | Code signed for another invitee, or expired: simulation error ("Invalid signature"), button disabled | MEM | W C | @core | `accept-invite.spec.ts`: two tests. The expired code's wording is not pinned: `SignatureExpired` has no message in `src/utils/errors.ts` |
| E8 | Already-invited member: accept form hidden, generator still shown | MEM | W G | @core | `accept-invite.spec.ts` |
| E9 | Reject the typed-data signature: error toast, no code | MEM | W S | @edge | `referral-codes.spec.ts` |
| E10 | Generated code disappears after 3 minutes or when the address changes | MEM | W S | @edge | `referral-codes.spec.ts`: two tests (the page's clock; another address) |
| E11 | Inviter is a legacy member (rights on the wallet): the code still works | LEG | W S U | @edge | not automated: by reading it is the same path as E2 and E5. The `legacy` persona exists now (C10, C11), if a test is wanted |
