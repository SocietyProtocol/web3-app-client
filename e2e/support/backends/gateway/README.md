# The query gateway's policy, in the subgraph fake

On staging and production, `/api/graphql` does not talk to the subgraph. It talks to the
query gateway (`web3-app-subgraph`, `infra/query-gateway/server.js`), which serves only the
persisted documents of its registry and refuses with a 400 any variables outside the
operation's `variablePolicy`: filter keys it does not list, filters nested deeper than its
`maxDepth`, sorts it does not list, numbers or strings out of range, undeclared variables.

The subgraph fake applies the same checks before it answers (`server.mjs`), so a filter the
gateway refuses fails here too. Before, the fake answered everything, and the member search
(K5) passed here while it failed on staging and production.

| File | What it is |
|---|---|
| `registry.cjs` | A verbatim copy of `infra/query-gateway/generated/registry.js`. Never edit it by hand. |
| `source.json` | The ref and commit it was copied from, its sha256, and the gateway commit whose validation code `policy.mjs` ports. |
| `policy.mjs` | A port of the gateway's request checks (`parseGraphQLRequest`, `canonicalizeApprovedDocument`, `validateVariables`). Same messages, same order. |
| `refresh.mjs` | Copies the registry from a subgraph checkout and refuses to when the gateway's validation code changed since the port. |
| `policy.test.mjs` | Unit tests (`yarn test`): the port against the gateway's own test cases, the snapshot against the app's persisted documents, and the filters the app builds (members, accounts, badges, communities) against the policy. |

## Why a snapshot, and not a fetch at stack start

- The suite runs without network access except to the fork RPC. A fetch from GitHub at
  start would need a token for the private subgraph repository in CI and on every machine.
- A run is reproducible: the policy of a run is in the commit that ran, not whatever the
  subgraph branch held that minute.
- A gateway change shows up as a reviewed diff in this repository, together with the tests
  that it turns green or red (the K5 search, for instance).

The cost is that the snapshot can fall behind the gateway. `refresh.mjs --check` tells.

## Which gateway

The snapshot follows `origin/staging` of `web3-app-subgraph`: staging's client runs against
staging's gateway. Production runs `main`'s gateway, which allowed fewer filter keys at the
time of writing (no `id_in` for Badges, Communities and Users, no `id_not_in` for Users). To
see whether the app's filters pass production's gateway, check against `main` once
(`--ref origin/main`) without committing the result.

## Refresh it

When the gateway's registry changes (a gateway fix, a new persisted query), with a clone of
`web3-app-subgraph` next to this repository:

```
git -C ../web3-app-subgraph fetch origin
yarn test:e2e:gateway-snapshot                          # copies origin/staging
yarn test:e2e:gateway-snapshot --ref origin/main        # another ref
yarn test:e2e:gateway-snapshot --subgraph /path/to/web3-app-subgraph
yarn test:e2e:gateway-snapshot --check                  # changes nothing; exit 1 if behind
yarn test
```

Commit `registry.cjs` and `source.json` together, with the test changes the new policy
brings: a test marked as an expected failure because of the gateway turns red once the
snapshot holds the fix. Remove its `test.fail` (or `.fails` in `policy.test.mjs`) in the same
commit.

If `refresh.mjs` stops because the gateway's validation code changed, read the diff it prints,
port the change to `policy.mjs`, add a case to `policy.test.mjs`, and run it again with
`--accept-validator`.
