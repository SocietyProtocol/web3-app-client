# Wallet connection and network: scenarios

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
| B-1 | Connect via RainbowKit modal; header shows Society address, not the EOA | NEW | W C | @smoke | `connect/connect.spec.ts` |
| B-2 | Account menu lists "Society address" and "Wallet (owner)"; copy buttons work | MEM | W | @core | `connect/account-menu.spec.ts` |
| B-3 | Header shows profile name and avatar once the profile exists | MEM | W G | @core | `connect/account-menu.spec.ts` |
| B-4 | Reload keeps the connection; skeleton until wagmi is ready | MEM | W | @core | `connect/account-menu.spec.ts`; two `test.fail`: the setup prompt shows to a member while the wallet's code is read, and the header shows "Connect Wallet" for a moment while wagmi reconnects |
| B-5 | Disconnect via "Wallet settings" returns to Connect; guarded pages show the connect bubble | MEM | W | @core | `connect/account-menu.spec.ts` |
| B-6 | Wallet on the wrong chain: header error state; guarded pages show "Switch to Sepolia" | MEM | W | @core | `connect/network.spec.ts` |
| B-7 | Switch button calls `wallet_switchEthereumChain` and content appears | MEM | W | @core | `connect/network.spec.ts` |
| B-8 | User rejects the connection request; modal stays, no crash | LO | W | @edge | `connect/identity.spec.ts` |
| B-9 | Account change in the wallet updates the Society address and closes the setup wizard | MEM→NEW | W | @edge | `connect/identity.spec.ts` |
| B-10 | Contract wallet acts as itself: no owner row, no Light Account | CW | W C | @edge | `connect/identity.spec.ts`, identity only: code is put at the test wallet's address |
| B-11 | 7702-delegated EOA still gets a Light Account identity | NEW | W C | @edge | `connect/identity.spec.ts`, identity only |
| B-12 | Bytecode read fails: falls back to the Light Account, no infinite skeleton | NEW | W | @edge | `connect/identity.spec.ts` |
