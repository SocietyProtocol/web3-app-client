# Lock SPEC / VIP: scenarios

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

SPEC and the lock belong to the owner wallet, and approve, lock and unlock are transactions of the
wallet itself. The subgraph fake does not follow the VIP manager: history rows are built by the tests
from transactions that happened (`support/builders/lock-spec.ts`).

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| N1 | /profile/lock-spec guard: logged out, wrong network, no profile | LO, NEW | W G | @core | `lock-spec.serial.spec.ts` (two tests) |
| N2 | Lock tab: tier cards from on-chain amounts, duration picker, summary (plan, amount, unlock date), wallet balance label | MEM | W C | @core | `lock-spec.serial.spec.ts` |
| N3 | "Insufficient Balance" disabled state | MEM | W C | @core | `lock-spec.serial.spec.ts` |
| N4 | "Approve and Lock": approve then lock; lock appears; community tier reflects it | MEM (SPEC on wallet) | W T T G C | @core | `lock-spec.serial.spec.ts` ("community tier reflects it" is not covered: a personal lock changes no community's tier) |
| N5 | Claim tab before unlock: "Wait until lock period is over" | MEM | W C | @core | `lock-spec.serial.spec.ts` |
| N6 | Claim after expiry: unlock transaction (needs time travel on a fork) | MEM | W T G C | @edge | `unlock-after-expiry.timetravel.spec.ts` (moves the chain's clock, so it runs in the `hermetic-timetravel` project, after everything else) |
| N7 | History tab list; "No lock activity found." | MEM | W G | @edge | `lock-spec.serial.spec.ts` (two tests) |
| N8 | `?tab=` deep links | MEM | W | @edge | `lock-spec.serial.spec.ts` |
