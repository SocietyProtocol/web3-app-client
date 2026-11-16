# Badges browse, detail and amounts: scenarios

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
| G1 | /badges grid, header, FAQ link, "Create Badge" | LO | G | @smoke | `badges/badges-list.spec.ts`. The page opens on official badges and the fork has none, so the test creates one. |
| G2 | Tabs All / Managed by me / My badges (disabled when logged out) | LO, MEM | W G | @core | `badges/badges-list.spec.ts`: two tests, logged out and a member who manages one badge and holds another. |
| G3 | Search; category filter Official/Community/Individual; sort; Created by; URL persistence | LO, MEM | W G | @core | `badges/badges-list.spec.ts`: five tests. Search and categories; sort; Created by an address with reload and deep link; Created by Me (connected); and typing an address into Created by key by key (every key stays in the field; the list is narrowed once the text is a whole address). |
| G4 | Infinite scroll; empty and error states | LO | G | @edge | `badges/badges-list.spec.ts`: three tests. The scroll test overlays 1005 badges: a page of the list is 1000. |
| G5 | /badges/<id> detail: image, ID chip, Official/Community chip, name, description, metadata link, creator | LO | G | @smoke | `badges/badge-page.spec.ts`: two tests, a badge with picture and description, and an official badge without either. |
| G6 | /badges/<unknown> gives 404 | LO | G | @core | `badges/badge-page.spec.ts`: two tests, an id no badge has and an id that is not a number. |
| G7 | **B2**: every holder shows "n / total", with n from `balanceOf` and total from `totalSupply`, for an official, a community and an individual badge, in the Holders list and in its modal | LO | G C | @smoke | `badges/badge-detail.spec.ts`: three tests, one per kind. The official badge is created by the test (the fork has none) and has a holder of two units. |
| G8 | **B2**: the same chips on profile badge cards and the badges modal | LO, MEM | W G C | @core | `badges/profile-badges.spec.ts`: two tests. Logged out, the fork account with the most badges: every card in the row and in the modal. A connected member's own profile, with a badge held twice. |
| G9 | Holders modal ("View All Holders", "And N more holders…") | LO | G | @core | `badges/badge-page.spec.ts`: six holders (no button), then eight. |
| G10 | Permission lists (who can Mint/Burn/Transfer/Manage) render linked badges and users | LO | G | @core | `badges/badge-page.spec.ts` |
| G11 | No permissions: Actions area has no tabs; logged out or wrong network shows the bubble inside Actions | LO, MEM, BM | W | @core | `badges/badge-page.spec.ts`: three tests. A member without rights; the wrong network (a minter, since the prompt only exists where there are tabs); and logged out: the Actions area asks to connect a wallet. |
| G12 | Chain read fails: chips omitted, page still renders | LO | G C | @edge | `badges/badge-page.spec.ts`: every `eth_call` of the page fails. |
