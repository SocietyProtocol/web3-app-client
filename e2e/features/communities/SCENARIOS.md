# Communities list and creation: scenarios

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
| J1 | /communities grid, FAQ link, Create Community | LO | G | @smoke | `communities-list.spec.ts` |
| J2 | Tabs All / My Communities; "Only communities that I manage" switch | MEM, MGR | W G | @core | `communities-list.spec.ts` |
| J3 | Search; tier filter (gold/silver/bronze/unaffiliated, "Show unaffiliated"); sort including tier | LO | G | @core | `communities-list.spec.ts`, four tests: search, tier filter, Show unaffiliated, sort |
| J4 | Empty and error states; infinite scroll | LO | G | @edge | `communities-list.spec.ts`, three tests: empty, error and Retry, scrolling |
| J5 | /create-community guard states | LO, MEM | W | @core | `communities-create.spec.ts` |
| J6 | Create community end to end (info, badge details, review); "Community Created!" with View Community / View Transaction | MEM (funded) | W S UF I G | @smoke | `communities-create.spec.ts`. Reviewed: the wallet pays through the Light Account (one upload signature, one transaction) |
| J7 | Validation: name and description required, metadata JSON, images | MEM | W | @core | `communities-create.spec.ts`, three tests: name and description, metadata JSON, logo |
| J8 | A new user creates a community: with ETH in the wallet, two wallet transactions (set up the Society account, then createCommunity through it); without, "Your wallet 0x… needs about X ETH to pay the network fee for this action" after the upload and nothing sent. **Re-mapped:** was "New unfunded user: needs-ETH message" about the Light Account | NEW | W S T I C | @core | `communities-create.spec.ts`, three tests: with ETH, the step-2 notice while its wallet prompt is open, without ETH |

The specs were verified on 2026-11-16 (each test passed, or failed at its known bug, 3 runs in a row). The
page objects are `support/pages/communities.ts` and `support/pages/communities-create.ts`; the
overlay builders are `support/builders/communities-entities.ts`. The subgraph fake holds no
communities of its own, so every community of these tests is an overlay.
