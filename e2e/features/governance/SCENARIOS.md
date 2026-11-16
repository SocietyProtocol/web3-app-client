# Governance: scenarios

One row per scenario. A test's title starts with the row's ID. Add a row here in the same pull
request that adds the feature or the test, and fill in the "Test" column when the row is automated.

- **Persona:** LO logged out, NEW fresh wallet without a profile, MEM member with a profile, LEG legacy
  wallet, MGR community manager, BM badge minter / burner / transferer, OBC official badge creator,
  GOV Governor badge holder, CW contract wallet. See `e2e/support/personas.ts` for what exists.
- **Needs:** W wallet connected, S signature, U sponsored user operation, T wallet transaction,
  R role, G subgraph, C chain read, I IPFS pin. (UF, "the Light Account pays its own gas", no longer
  exists: such writes are now paid by the owner wallet through the account, which is a T.)
- **Tag:** `@smoke`, `@core` or `@edge`.

In the "Test" column, **unverified** marks tests that were written without being run and carry the
`@unverified` tag (see "Unverified specs" in `e2e/README.md`).

The rows were imported from the planning inventory, which was read from the app before the
owner-pays routing change. Rows marked "review" describe the old behaviour ("needs ~X ETH",
a self-funded user operation): re-read `src/lib/outpost-routing.ts` before automating them.

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| L1 | /governance renders markdown and both Snapshot buttons with the configured URLs, opening in a new tab | LO | – | @smoke | `governance/governance-page.spec.ts`: the text and its links are compared with `/api/copywriting/governance`; a click opens a second tab |
| L2 | **B3**: the denominator on every Governor chip equals on-chain `totalSupply` of the Governor badge, not a constant | LO | G C | @smoke | `governance/governance.spec.ts` |
| L3 | **B4**: each Governor shows "n / total · p%"; p equals n/total to 2 decimals; percentages sum to about 100 | LO | G C | @smoke | `governance/governance.spec.ts` (seeds a Governor with three units) |
| L4 | **B3/B4** after a mint or burn of the Governor badge: denominator and percentages change on reload | BM (a member holding the Governor badge's minter badge) | W T G C R | @core | `governance/governance.spec.ts`: the mint goes through the app's Mint tab, the burn is made on chain |
| L5 | "View All Governors" modal; "No governors found" empty state | LO | G | @edge | `governance/governance.spec.ts`: the empty state. The modal is walked by L2 and L3. |
| L6 | Total-supply read fails, or is still loading: chip shows the count only, no "NaN%" | LO | G C | @edge | `governance/governance.spec.ts`: two tests, one holds the read back, one makes it fail |
| L7 | Community Governance tab placeholder with social links | LO | G | @edge | `governance/governance-page.spec.ts`: a community from a subgraph overlay, by the tab and by `?tab=governance` |
