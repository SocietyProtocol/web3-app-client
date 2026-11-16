# Badge create and edit: scenarios

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
| I1 | /create-badge guard: logged out, then wrong network | LO, MEM | W | @core | `badge-create/create-badge.spec.ts` |
| I2 | Create an individual badge end to end, with image, metadata, permissions and managers; redirect to /badges/<new id>. **Re-mapped:** the wallet pays through the Light Account (one signature for the upload, one transaction) | MEM (funded) | W S T I G C | @smoke | `badge-create/create-badge.spec.ts` |
| I3 | Validation: name required and at most 100 characters, metadata must be JSON | MEM | W | @core | `badge-create/create-badge-form.spec.ts` |
| I3 | Image constraints: at most 2 MB, JPEG / PNG / WebP / SVG / GIF; removing the image unblocks the wizard | MEM | W | @core | `badge-create/create-badge-form.spec.ts` |
| I4 | No "Official Badge" checkbox without the role | MEM | W C | @core | `badge-create/create-badge.spec.ts` |
| I4 | The role is on the Society address: checkbox offered, the official badge is created by the Light Account and paid by the wallet. **Re-mapped:** no self-funded user operation | OBC | W T C R | @core | `badge-create/create-badge.spec.ts` |
| I4 | The role is on the wallet only: checkbox offered, the wallet itself sends createBadge and is the creator | MEM (funded) + role on the wallet | W T C R | @core | `badge-create/create-badge.spec.ts` |
| I5 | Create a community badge from /communities/<id>/create-badge (no "Who can Manage" section); redirect to `?tab=badges`. **Re-mapped:** the wallet pays through the Light Account | MGR | W T G C R | @core | `badge-create/create-badge.spec.ts`: uses the `communityManager` persona; the test tells the fake the badge's link to the community, as the real subgraph records it from the registry |
| I6 | Preview card shows the name as typed and the kind of badge, on both steps | MEM | W | @edge | `badge-create/create-badge-form.spec.ts` (the official label of the preview is checked in I4) |
| I6 | Preview card shows the chosen image | MEM | W | @edge | `badge-create/create-badge-form.spec.ts` |
| I7 | A new user (Light Account not deployed) creates a badge: two wallet transactions, announced as "Step 1 of 2: confirm setting up your Society account in your wallet" and "Step 2 of 2: confirm the action in your wallet"; the badge's creator is the Light Account. **Re-mapped:** was "Unfunded Light Account: blocked with the needs-ETH message". The wallet pays now | NEW (funded) | W T G C | @core | `badge-create/create-badge-routing.spec.ts` |
| I7 | The notice of step 2 stays while its wallet prompt is open | NEW (funded) | W T | @edge | `badge-create/create-badge-routing.spec.ts` |
| I7 | A new user without ETH: "Your wallet 0x… needs about X ETH to pay the network fee for this action", nothing sent, the wizard stays usable. **Re-mapped:** the message names the wallet and the fee of both wallet transactions, not the Light Account | NEW | W C | @core | `badge-create/create-badge-routing.spec.ts` |
| I8 | Manage (`?edit=true`): manager edits name, image and metadata via `modifyBadge`; detail updates. **Re-mapped:** the wallet pays through the Light Account (one signature for the upload, one transaction) | BM (manager) | W S T I G C R | @core | `badge-create/edit-badge.spec.ts` |
| I8 | Cancel closes the edit form: nothing signed or sent, badge unchanged | BM (manager) | W C | @edge | `badge-create/edit-badge.spec.ts` |
| I9 | A visitor or a non-manager opens `?edit=true`: the badge's page, no edit form, no Manage button | LO, MEM | W G C | @edge | `badge-create/edit-badge.spec.ts` |
| I10 | Upload-metadata returns 401 (device clock six minutes slow): "Message expired", nothing pinned, no transaction | MEM (funded) | W S | @edge | `badge-create/create-badge-form.spec.ts` |
| I10 | Upload-metadata returns 500 (storage down): "Server error occurred. Please try again later.", no transaction; Finish works once storage is back | MEM (funded) | W S T I C | @edge | `badge-create/create-badge-form.spec.ts` |
