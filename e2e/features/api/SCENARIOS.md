# Server routes: scenarios

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
`@unverified` tag (see "Unverified specs" in `e2e/README.md`); **expected failure** marks a test
kept failing by an app bug (`test.fail`, with the reason next to it).

The rows were imported from the planning inventory, which was read from the app before the
owner-pays routing change. Rows marked "review" describe the old behaviour ("needs ~X ETH",
a self-funded user operation): re-read `src/lib/outpost-routing.ts` before automating them.

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| P1 | `/api/graphql` accepts each persisted operation the UI uses | LO | G | @smoke | `api/graphql.api.spec.ts`; every persisted query by name: `api/graphql-contract.api.spec.ts` |
| P2 | `/api/graphql` rejects an ad-hoc query, a mutation, wrong content type, oversized body, and GET | LO | – | @core | `api/graphql.api.spec.ts`; mutation, subscription, two operations, a changed or renamed persisted query, bodies that are no GraphQL request, 128 KiB limit, PUT/PATCH/DELETE: `api/graphql-contract.api.spec.ts` |
| P3 | `/api/aa/rpc` GET health; POST rejects unlisted methods, EntryPoint 0.6 fields, non-allowlisted calls, a non-canonical factory | LO | – | @core | `api/aa-rpc.api.spec.ts`; non-canonical factory, salt and factory data, undeployed sender, the rest of the allowlist, non-Outpost targets, another EntryPoint or chain, gas caps, malformed requests: `api/aa-rpc-refusals.api.spec.ts` |
| P4 | `/api/profile` and `/api/upload-metadata`: 401 without or with stale auth, 400 on invalid body | LO | S | @core | `api/profile.api.spec.ts` (`/api/profile`: three refusals and the happy path); every authentication refusal for both routes, `/api/profile` body validation and avatar pin, `/api/upload-metadata` bodies, pins and failure: `api/upload-metadata.api.spec.ts` |
| P5 | `/api/copywriting/<each slug>` returns 200 with the file it stands for; unknown returns 404 | LO | – | @smoke | `api/copywriting.api.spec.ts`. One test is an **expected failure**: a slug that is an inherited object property (`constructor`, `toString`) is answered with 500, not 404 (app bug: the slug is looked up in a plain object) |
| P6 | GraphQL upstream down (mocked 502/504): pages show error states, not blank | LO | G | @edge | `api/graphql.api.spec.ts` (502). An answer that is not JSON, a GraphQL error without its wording, a timeout (504, takes 20 s): `api/graphql-contract.api.spec.ts`. In the browser: `api/graphql-upstream.spec.ts`, two **expected failures**: /profile of a member refetches the failed User query forever behind a skeleton (app bug: ContentGuard remounts the failed query, which TanStack Query fetches again on mount), and /governance says "No governors found" (app bug: Governance.tsx does not read the query's error). The lists' error states are F6, G4, J4 |
| P7 | `/api/aa/rpc` rate limits: five paymaster calls a minute per sender ("Too many sponsorship requests"), ten per visitor ("Too many requests"), both -32005; another sender of the same visitor is still served | LO | – | @core | `api/aa-rpc.api.spec.ts` |
| P8 | `/api/graphql` rate limit: a visitor's sixty-first request in a minute is refused with 429 and `retry-after: 60`, also a good query; another visitor is still served | LO | – | @core | `api/graphql-contract.api.spec.ts` |
| P9 | Free first badge: `/api/aa/first-badge` says disabled by default and the proxy refuses createBadge; with the suite's cookie a member without badges is eligible and its createBadge stub call is passed on; a stale or non-zero-key nonce is refused; after a badge exists the status says "used" and the proxy refuses; bad chain or sender is 400 | MEM | C G | @core | `api/first-badge.api.spec.ts` (**unverified**) |
