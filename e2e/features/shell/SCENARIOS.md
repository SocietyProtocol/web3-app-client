# Shell, navigation, static content: scenarios

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
| A1 | Home renders hero, identity card with Connect, feature cards; no console errors | LO | – | @smoke | `shell/home.spec.ts` |
| A2 | Sidebar's 8 items navigate (Home, Profile, Accounts, Badges, SPEC Token, Governance, Communities, Auction) | LO | – | @smoke | `shell/navigation.spec.ts` |
| A3 | Sidebar collapse/expand; mobile drawer opens and closes at phone viewport | LO | – | @core | `shell/navigation.spec.ts` |
| A4 | Home feature cards route to /badges, /communities, /governance, /auction | LO | – | @core | `shell/home.spec.ts` |
| A5 | Home FAQ and "What is this?" markdown load from `/api/copywriting` | LO | – | @core | `shell/home.spec.ts`; the "What is this?" half is **fixme** until the owner decides: the text is in `Home.tsx`, not copy from the route, so either this row or the page is out of date (not counted as an app bug) |
| A6 | /badges-faq, /communities-faq, /spec-token (markdown and distribution chart) render | LO | – | @smoke | `shell/static-pages.spec.ts` |
| A7 | Unknown route shows "Page Not Found" and "Back to Home" | LO | – | @core | `shell/navigation.spec.ts` |
| A8 | Home identity card: "Claim your account" goes to `/profile?setupOpen=true` | NEW | W C | @core | `shell/home.spec.ts` |
| A9 | Home identity card: "Check your profile" | MEM | W C | @core | `shell/home.spec.ts`; one `test.fail`: "Claim your account" shows while the wallet's code is read |
| A10 | Hero video plays and closes when `NEXT_PUBLIC_HERO_VIDEO_URL` is set; Welcome card otherwise | LO | – | @edge | `shell/home.spec.ts`, Welcome card only: the suite's build has no hero video |
| A11 | Footer and header logo links; external X/Discord links (in the header from 900px up, in the drawer below) carry `target=_blank` | LO | – | @edge | `shell/home.spec.ts` |
| A12 | Header links Website, Forum, YouTube, Discord and X, in that order, each with its exact `href`, `target=_blank`, `rel=noopener` and accessible name; pills show labels; YouTube is left out while its URL is null | LO | – | @smoke | `shell/external-links.spec.ts` |
| A13 | Hover and keyboard focus give a link the "selected" fill (`action.selected`), focus adds a 2px outline; no `aria-current` | LO | – | @core | `shell/external-links.spec.ts` |
| A14 | 900 to 1199px: compact links, circles name themselves on hover; below 900px (820, 390) the links move to the drawer and fit it; the header never overflows, also with a connected member's 100-character name (390, 820, 900, 1024, 1199, 1200) | LO, MEM | W | @core | `shell/external-links.spec.ts` |
| A15 | Docs banner below the last nav item and above Collapse, a tile with a "Documentation" tooltip when collapsed, in the phone drawer; opens docs.societyprotocol.io in a new tab | LO | – | @core | `shell/external-links.spec.ts` |
