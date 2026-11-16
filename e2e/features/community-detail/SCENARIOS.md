# Community detail, members and settings: scenarios

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
| K1 | /communities/<id>: header, tier and expiry, Overview with members and Recent Activity | LO | G | @smoke | `community-detail.spec.ts`, two tests |
| K2 | /communities/<unknown> gives 404 | LO | G | @core | `community-detail.spec.ts` |
| K3 | Tabs via `?tab=`; Governance tab "Coming Soon"; Settings tab hidden for non-managers and when deep-linked | LO, MEM | G | @core | `community-detail.spec.ts`, two tests: visitor and member, manager |
| K4 | Activity feed descriptions by type; "Load more activities" | LO | G | @edge | `community-detail.spec.ts` |
| K5 | Members tab: table, search, sort, pagination / "Load more", empty states | LO | G | @core | `community-detail.spec.ts`, three tests: pages and sort, search, empty |
| K6 | Manager sees Revoke per row; revoke burns the member badge and the row disappears | MGR | W S UF G R | @core | `community-manage.spec.ts`. Reviewed: the wallet pays through the Light Account |
| K7 | Manager badge-actions panel: pick badge; mint member or assistant badge; burn; transfer | MGR | W S UF G R | @core | `community-manage.spec.ts`, two tests: mint the member badge; pick, mint and burn the assistant badge. Transfer is not automated: the registry creates the member and assistant badges without transferers, so the panel has no Transfer tab for them (asserted); it would need an extra community badge with transferers |
| K8 | A manager whose manager badge is still on the wallet sees the manager controls, and the writes are sent by the wallet itself (owner route) | LEG+MGR | W T G R | @core | `community-manage.spec.ts`: a community created by the wallet itself, Edit Info sent by the wallet straight to the registry |
| K9 | Badges tab lists community badges; manager "Create Badge" link | MGR | W G R | @core | `community-detail.spec.ts`, two tests; the first also checks that a badge with one holder reads "1 holder" |
| K10 | Settings: Edit Info via `updateCommunityDetails`; header updates | MGR | W S UF G R | @core | `community-manage.spec.ts`. Reviewed: the wallet pays through the Light Account |
| K11 | Settings: edit Manager/Assistant/Member badge (image, name, metadata) | MGR | W S UF I G R | @core | `community-manage.spec.ts`, two tests: member badge (image, name, metadata), manager badge (name only). The assistant badge is not edited by a test |
| K12 | Transfer Ownership: irreversible warning, confirm checkbox, hint without Replace; manager access lost afterwards | MGR | W S UF G R | @edge | `community-manage.spec.ts`. Reviewed: the wallet pays through the Light Account |
| K13 | Assistant or member role holder: no Settings tab; permissions follow the badge config | MEM (assistant) | W G R | @edge | `community-manage.spec.ts`, two tests: assistant, member |

The specs were verified on 2026-11-16 (each test passed, or failed at its known bug, 3 runs in a row). The page
object is `support/pages/community-detail.ts`.

`community-detail.spec.ts` only looks: its communities are overlays
(`support/builders/communities-entities.ts`). `community-manage.spec.ts` writes: its communities
are created on the local chain through the CommunityRegistry
(`support/builders/community-detail-seed.ts`) and listed in the fake by an overlay. The fake does
not follow the registry and keeps no memberships, so after a write whose result the page reads
from those (K6, K7 mint, K8, K10, K12) the test tells the fake what the real subgraph would have
indexed, between the transaction and the page's refetch (`indexAfter` in `steps.ts`). Those tests
prove the transaction, its route, and that the page asks again and renders the new state; they do
not prove the indexing.
