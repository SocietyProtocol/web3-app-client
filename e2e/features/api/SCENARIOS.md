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
| P5 | `/api/copywriting/<each slug>` returns 200 with the file it stands for; unknown returns 404 | LO | – | @smoke | `api/copywriting.api.spec.ts`. Includes slugs that are inherited object properties (`constructor`, `toString`), which must be 404 too |
| P6 | GraphQL upstream down (mocked 502/504): pages show error states, not blank | LO | G | @edge | `api/graphql.api.spec.ts` (502). An answer that is not JSON, a GraphQL error without its wording, a timeout (504, takes 20 s): `api/graphql-contract.api.spec.ts`. In the browser: `api/graphql-upstream.spec.ts`: /profile of a member settles on an error with a retry once the User query has failed, and /governance says the Governors could not be loaded and offers a retry, not "No governors found". The lists' error states are F6, G4, J4. A refusal of the query gateway (400, 413, 422) is passed on with its status, not as a 502 (`src/app/api/graphql/route.test.ts`; through the subgraph fake, which applies the gateway's policy: SG-5 in `stack/subgraph-fake.api.spec.ts`, and the 128 KiB case of P2) |
| P7 | `/api/aa/rpc` rate limits: five paymaster calls a minute per sender ("Too many sponsorship requests"), ten per visitor ("Too many requests"), both -32005; another sender of the same visitor is still served | LO | – | @core | `api/aa-rpc.api.spec.ts` |
| P8 | `/api/graphql` rate limit, a token bucket per Cloudflare visitor IP (`cf-connecting-ip`): a burst of sixty is served at once, the next request is refused with 429 and `retry-after: 60`, also a good query; another visitor IP behind the same edge (same `x-forwarded-for`) is served, and another `x-forwarded-for` does not give the visitor a fresh bucket; afterwards one request a second is served again, not the whole burst | LO | – | @core | `api/graphql-contract.api.spec.ts` (three tests); the same with a frozen clock, and the whole burst back after a minute: `src/app/api/graphql/route.test.ts` |
| P9 | In the browser: a visitor gets a page although a neighbour behind the same Cloudflare edge has used up their own `/api/graphql` allowance, and none of the page's requests is refused | LO | G | @core | `api/graphql-rate-limit.spec.ts` |
| P10 | In the browser: a visitor who has used up their own `/api/graphql` allowance is refused at first and gets the page seconds later, from the app's retries and the refilled tokens, not after a minute | LO | G | @edge | `api/graphql-rate-limit.spec.ts` |
| P11 | `/api/aa/rpc` limit on sponsored new accounts per visitor IP (`SPONSORED_PROFILES_PER_IP_PER_DAY=1`): the first createProfile signing call is served, the second from the same IP is refused with -32005 "Daily sponsored profile limit reached" while its stub call is served; another IP is served; IPv6 visitors are counted per /64 | LO | – | @core | `api/aa-rpc-profile-limits.api.spec.ts` (a second app server with its own values) |
| P12 | `/api/aa/rpc` app-wide interval between sponsored new accounts (`SPONSORED_PROFILE_INTERVAL_SECONDS=300`): a second new account from another IP is refused with -32005 "Sponsored profile limit reached, try again in a few minutes", and so is the first IP's next one | LO | – | @core | `api/aa-rpc-profile-limits.api.spec.ts` |
| P13 | The limits follow the environment: `SPONSORED_PROFILES_PER_IP_PER_DAY=2` sponsors two new accounts per IP and refuses the third; with both at 0 (the suite's own app) a visitor's new accounts back to back are all sponsored | LO | – | @core | `api/aa-rpc-profile-limits.api.spec.ts` |
