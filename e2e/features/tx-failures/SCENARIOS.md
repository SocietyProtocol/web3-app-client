# Sponsorship and transaction failure states: scenarios

One row per scenario. A test's title starts with the row's ID. Add a row here in the same pull
request that adds the feature or the test, and fill in the "Test" column when the row is automated.

- **Persona:** LO logged out, NEW fresh wallet without a profile, MEM member with a profile, LEG legacy
  wallet, MGR community manager, BM badge minter / burner / transferer, OBC official badge creator,
  GOV Governor badge holder, CW contract wallet. See `e2e/support/personas.ts` for what exists.
- **Needs:** W wallet connected, S signature, U sponsored user operation, T wallet transaction,
  R role, G subgraph, C chain read, I IPFS pin. (UF, "the Light Account pays its own gas", no longer
  exists: such writes are now paid by the owner wallet through the account, which is a T.)
- **Tag:** `@smoke`, `@core` or `@edge`.

The rows O1 to O9 were imported from the planning inventory, which was read from the app before the
owner-pays routing change, and have been rewritten for the routing as it is now
(`src/lib/outpost-routing.ts`, `outpost-send.ts`): a write is sponsored, or the owner wallet pays for
it through the Light Account, or the wallet sends it itself; the Light Account never pays and is never
asked for ETH. Where a row's old expectation no longer exists, "Re-mapped" says what replaced it.
O10 to O15 are new.

Statuses in the "Test" column: a file name means automated and passing; **expected failure** means
the test runs, passes up to one marked assertion and is kept failing there by an app bug
(`test.fail`, with the reason next to it).

The refusals are answers given in the proxy's place with `aa.answer` (`e2e/support/aa/refusals.ts`).
The proxy's own are copies of what `src/lib/pimlico-proxy.ts` sends, and its two rate limits are
compared with the real proxy in P7 (`api/aa-rpc.api.spec.ts`). Pimlico's and the bundler's are
modelled, not recorded: a `live` journey has to back them. O15 and one O13 test stub nothing.

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| O1 | Pimlico refuses before the signature (policy budget spent; per-user allowance used up): notice "Free gas is unavailable right now, so your wallet will pay the network fee for this action (about X ETH). Confirm it in your wallet.", then one wallet transaction to the Light Account; the update is the Light Account's. **Re-mapped:** was the error "Society could not sponsor this action…" with nothing sent | MEM (funded) | W S T I G C | @smoke, @core | `tx-failures/sponsorship-refused.spec.ts` (two tests) |
| O1 | The paymaster's signature is refused after the wallet signed (AA34): "Society could not sponsor this action. Please try again later or ask an admin.", no wallet transaction | MEM (funded) | W S U I C | @edge | `tx-failures/sponsored-route.spec.ts` |
| O2 | Rate limit before the signature (the proxy's -32005 "Too many requests"; a gateway's HTTP 429): the wallet pays through the Light Account. **Re-mapped:** was the error "Too many requests…" with nothing sent | MEM (funded) | W S T I G C | @core | `tx-failures/sponsorship-refused.spec.ts` (two tests) |
| O3 | The bundler says the fee was not covered (AA21) after the wallet signed: "The network fee for this action could not be covered. Please try again.", no wallet transaction. **Re-mapped:** the self-funded user operation and its "does not have enough ETH…" message no longer exist; only this wording for an AA21 remains | MEM (funded) | W S U I C | @edge | `tx-failures/sponsored-route.spec.ts` |
| O4 | AA25 nonce clash after the wallet signed: "Your Society account has another action in progress. Wait for it to finish and try again.", no wallet transaction | MEM (funded) | W S U I C | @edge | `tx-failures/sponsored-route.spec.ts` (the bundler's answer is stubbed; two real saves at once are not tried) |
| O5 | The account refuses the wallet's signature (AA24) after the wallet signed: "Your wallet's signature was not accepted for your Society account…", no wallet transaction | MEM (funded) | W S U I C | @edge | `tx-failures/sponsored-route.spec.ts` |
| O6 | AA10 from a lagging node on the gas estimate: retried after three seconds, the write stays sponsored, each signature is asked once | MEM | W S U I G C | @edge | `tx-failures/sponsored-route.spec.ts` |
| O7 | A wallet-paid transaction reverts on chain (the profile was created elsewhere while the second prompt was open): error toast, Finish usable again, the wallet paid for both transactions. **Re-mapped:** was a self-funded user operation | NEW (funded) | W S T I C | @edge | `tx-failures/sponsored-route.spec.ts`: **expected failure** at the last step, the toast reads "Execution reverted with reason: custom error 0x6e8a1b0a." instead of "Profile already exists" (app bug: the receipt's error is not decoded) |
| O8 | A sponsored write asks only for signatures, also from a wallet that holds ETH; the submitted and the success toast link to the transaction on sepolia.etherscan.io, and that transaction carried the user operation | MEM (funded) | W S U I G C | @smoke | `tx-failures/sponsored-route.spec.ts`; the wallet-paid link is checked in H1 (`badge-actions/mint-routing.spec.ts`) |
| O9 | Gas label: "Simulating..." while the route is worked out; then the wallet's fee in USD when the wallet pays through the Light Account, and the estimate of the wallet's own call on the owner route. **Re-mapped:** "self-funded shows the prefund" no longer exists | BM | W C | @core | H1 and H11 in `badge-actions/mint-routing.spec.ts`. "$0" for a sponsored write, which only the accept-invite form shows: `tx-failures/gas-label.spec.ts` |
| O10 | The proxy has no Pimlico key ("Sponsorship is not configured" for every call): the wallet pays through the Light Account | MEM (funded) | W S T I G C | @core | `tx-failures/sponsorship-refused.spec.ts` |
| O11 | Sponsorship refused for a new user whose Light Account is not deployed: the notice announces two transactions, the wallet first calls createAccount on the factory, then sends createProfile through the account with a gas limit fixed by the app; the profile is the Light Account's | NEW (funded) | W S T I G C | @core | `tx-failures/sponsorship-refused.spec.ts` |
| O12 | Sponsorship refused and the wallet has no ETH: "Free gas is unavailable right now and your wallet 0x… does not have enough ETH to pay the network fee (about X ETH). Add ETH to your wallet or try again later.", nothing sent; the save is sponsored again once the refusal ends. **Re-mapped from I7/J8/H10's "needs ~X ETH":** the message names the wallet, never the Society account | NEW | W S U I C | @core | `tx-failures/sponsorship-refused.spec.ts` |
| O13 | A sponsored write that would revert (createProfile for an account that got its profile elsewhere) is reported as that revert ("Profile already exists") and is not sent at the wallet's expense: once with the refusal stubbed, once with nothing stubbed, where the bundler refuses the gas estimate | NEW (funded) | W S I C | @core | `tx-failures/sponsorship-refused.spec.ts` (two tests) |
| O14 | The user declines: the user operation's signature (sponsorship was granted) or the wallet payment after a refusal. "User rejected the request.", nothing sent, no fallback; paying works when tried again | MEM (funded) | W S T I C | @core | `tx-failures/sponsored-route.spec.ts`, `tx-failures/sponsorship-refused.spec.ts` |
| O15 | The real proxy refuses a sender's sixth request for sponsorship in a minute ("Too many sponsorship requests"), as a third send in quick succession would be, and the wallet pays through the Light Account | MEM (funded) | W S T I G C | @core | `tx-failures/sponsorship-refused.spec.ts` (nothing stubbed; the allowance is used up through the proxy with the test's own requests) |
