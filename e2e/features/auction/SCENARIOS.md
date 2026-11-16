# Auction: scenarios

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

The auction id is compiled into the app (`NEXT_PUBLIC_AUCTION_ID`), so one build runs either M1 or
M2 to M10. The build and the tests read the id from `auction.id` in `e2e/env/hermetic.json`, which
is `null` as committed: M2 to M10 skip themselves, M1 runs. With an id (the EasyAuction contract's
`auctionCounter() + 1` at the fork block) M2 to M10 run, M1 skips itself, and A2 in
`features/shell/navigation.spec.ts` no longer finds the "Coming soon" heading it expects. The subgraph
fake does not follow the EasyAuction contract: the tests index the auction and its orders themselves,
from what is on chain.

M2 to M10 were run with `auction.id` set to 7 (the fork's `auctionCounter()` is 6) in a local build that
was not committed: M2 passes, and the other tests fail as expected at the lines their `test.fail` names,
3 of 3 runs each. M3 to M10 then failed on a crash of the running auction's page (string `decimals` from
the subgraph reaching viem's `formatUnits`); the app now converts them, the `test.fail` marks are gone, and
M3 to M10 have not yet been run against the fix.

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| M1 | No auction id configured: "SPEC ICO Auction" with "Coming soon" | LO | – | @smoke | `auction-view.serial.spec.ts` (runs only in a build without an auction id) |
| M2 | Auction configured but not started or ended: inactive view with kickoff date; sidebar status chip | LO | G | @core | `auction-view.serial.spec.ts` (four tests, two of them `test.fail`: the kickoff date and the sidebar chip of an auction that has not started) |
| M3 | Active auction: clearing price, bidding token, countdown, totals, chart | LO | G C | @core | `auction-view.serial.spec.ts` |
| M4 | Bid control guard: logged out, then wrong network | LO, MEM | W | @core | `auction-view.serial.spec.ts` |
| M5 | Bid validation: below min bid or min price, insufficient balance | MEM | W C | @core | `auction-view.serial.spec.ts` |
| M6 | Place bid with approval: approve transaction, "Approval confirmed, placing bid…", second transaction, "Bid Placed!", appears in Your Bids | MEM (tokens on wallet) | W T T G C | @core | `auction-bids.serial.spec.ts` (the bid that may not be placed by itself after the approval is suspected by reading only and not marked; see the comment at the wallet poll) |
| M7 | Place bid with existing allowance: one transaction | MEM | W T G | @edge | `auction-bids.serial.spec.ts` |
| M8 | Cancel bid; disabled with a tooltip after the cancellation period or on the wrong network | MEM | W T G | @core | `auction-bids.serial.spec.ts` (three tests) |
| M9 | Reject the approval or the bid transaction | MEM | W T | @edge | `auction-bids.serial.spec.ts` (two tests) |
| M10 | Your Bids empty state; bid statuses | MEM | W G | @edge | `auction-view.serial.spec.ts` (the app only ever shows the status "Placed") |
