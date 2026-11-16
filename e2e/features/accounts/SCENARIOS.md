# Accounts directory and public profiles: scenarios

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
| F1 | /accounts lists cards; infinite scroll loads more | LO | G | @smoke | `accounts-directory.spec.ts`. The test seeds more than two pages; the cards' avatars use the images of the directory's pages and send no `User` request of their own. Like F2 to F5 it also ends with "no request of the directory was refused with 429" (a visitor has a burst of 60 /api/graphql requests that refills one a second) |
| F2 | Search by name or address; URL param persists on reload; clear | LO | G | @core | `accounts-directory.spec.ts`; no request refused with 429 |
| F3 | Sort Newest / Name | LO | G | @core | `accounts-directory.spec.ts`; no request refused with 429 |
| F4 | Role filter (Governors, Contributors, Core Team, Advisors, Moderators, Basic) | LO | G | @core | `accounts-directory.spec.ts`; no request refused with 429 |
| F5 | Each migrated member appears once (old wallet hidden once its Society address has a profile) | LO | G | @core | `accounts-directory.spec.ts`. The test seeds more than two pages; no request refused with 429 |
| F6 | Empty result "No accounts found"; GraphQL error state | LO | G | @edge | `accounts-directory.spec.ts`: two tests |
| F7 | "Setup Account" button for a connected user without a profile | NEW | W G | @core | `accounts-directory.spec.ts`: three tests, one of them for an address the subgraph knows without a profile |
| F8 | /user/<address> read-only profile (no Edit, no Manage referrals); `?edit=true` on it is ignored: the read-only profile, no edit form, for a connected member, for a visitor without a wallet (no prompt to connect) and on the member's own owner wallet (the form saves the Society address) | LO, MEM | W G C | @smoke | `public-profile.spec.ts`: four tests (the `?edit=true` cases are @core, @core and @edge) |
| F9 | /user/<own Society address> redirects to /profile | MEM | W | @core | `public-profile.spec.ts` |
| F10 | /user/<not an address> gives 404 | LO | – | @core | `public-profile.spec.ts` |
| F11 | /user/<legacy wallet>: shows the old profile until the Society address has one, then redirects | LO | G | @core | `public-profile.spec.ts` |
| F12 | Other member's SPEC balance read from the legacy owner when mapped | LO | G C | @edge | `public-profile.spec.ts`: two tests |
