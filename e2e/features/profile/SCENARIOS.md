# Profile view and edit: scenarios

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
| D1 | Profile page: stats, user card, Associated address, Profile ID, Referred by | MEM | W G C | @smoke | `profile-view.spec.ts` |
| D2 | SPEC balance read from the owner wallet, with a "held by your wallet 0x…" caption | MEM | W C | @core | `profile-view.spec.ts` |
| D3 | Edit (`?edit=true`): change name and bio, save via sponsored `updateProfileURI`, signature only | MEM | W S U I G | @smoke | `profile-edit.spec.ts`; the edit after a first save is also in C4, `onboarding/onboarding.spec.ts` |
| D4 | Cancel edit; browser Back leaves edit mode | MEM | W | @edge | `profile-edit.spec.ts` |
| D5 | Badges row shows count/total chips per badge; "View All Badges" modal | MEM | W G C | @core | G8 in `badges/profile-badges.spec.ts` |
| D6 | Eleventh profile update in a day (the proxy answers "Daily sponsored profile update limit reached" to the call that signs the sponsorship): the wallet pays for the update through the Light Account, after the "Free gas is unavailable right now…" notice. **Re-mapped:** was an error with nothing sent | MEM (funded) | W S T I G C | @core | `tx-failures/sponsorship-refused.spec.ts` (the proxy's answer is stubbed: ten real updates would need two minutes of the per-minute limit) |
| D7 | Edit while on the wrong network: guard with Back button | MEM | W | @edge | `profile-edit.spec.ts` |
