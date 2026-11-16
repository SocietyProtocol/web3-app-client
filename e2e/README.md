# Outpost browser tests

Playwright tests for the Outpost, next to the code they test. A feature and its tests ship in
the same pull request.

## Layers

| Project | What runs | What it proves | What it does not prove |
|---|---|---|---|
| `api` | Playwright `request`, no browser, against the real Next API routes | Route contracts: `/api/graphql`, `/api/aa/rpc`, `/api/profile`. Also the personas and the subgraph fake (`features/stack`). | Anything in the UI. The upstreams are local: the subgraph fake, the mock paymaster, the S3 fake. |
| `hermetic` | The production build (`next build && next start`) in Chromium, with an injected wallet, on a local chain | That the app drives a wallet, the contracts and its own API routes correctly: real signatures, the deployed contracts on a Sepolia fork, EntryPoint 0.7, the Light Account factory, a real bundler. | The Pimlico policy and its gas numbers, ERC-7562 validation, MetaMask's own behaviour, and real subgraph indexing (see "The subgraph fake"). |
| `hermetic-serial` | The same, for files named `*.serial.spec.ts`, after `hermetic` | Scenarios that change state other tests read: the auction and Lock SPEC (token balances and locks of the wallet, the one auction). | The same limits as `hermetic`. |
| `hermetic-timetravel` | The same, for files named `*.timetravel.spec.ts`, after `hermetic-serial` | Scenarios that move the chain's clock forward (claiming SPEC after a lock has ended). The clock is never put back, so they run last; restart a stack that was left running after them: sponsored writes no longer work on it (the mock paymaster dates its sponsorship by the wall clock), and that includes persona seeding. | The same limits as `hermetic`. |
| `extension` | Not implemented. See [extension/README.md](extension/README.md). | The real MetaMask extension. | |
| `live` | Not implemented. See [live/README.md](live/README.md). | Deployed staging: the real Pimlico policy, subgraph, Filebase and forum. | |

Unit tests stay in vitest (`yarn test`). WalletConnect, Coinbase / Base Account and Safe
connectors are covered by no layer.

## Run it

Once per checkout:

```
yarn install --frozen-lockfile
yarn test:e2e:install        # the local chain stack (e2e/aa-stack) and Chromium
```

Then:

```
yarn test:e2e                # api + hermetic + hermetic-serial + hermetic-timetravel
yarn test:e2e:smoke          # only the @smoke tests
yarn test:e2e:api            # only the route contracts
yarn test:e2e -g "C3"        # one scenario
yarn test:e2e:unverified     # only the specs that have never been run (see "Unverified specs")
```

The run starts the whole stack, runs the tests with one worker and stops the stack. The first
start builds the app (several minutes); later starts reuse the build while `src/`, `public/`
and the build inputs are unchanged, and take 15 to 40 seconds. `E2E_WORKERS=4 yarn test:e2e`
runs with four workers, each on a stack of its own (see "Several workers").

While writing tests, keep the stack running in another terminal. A test run then uses it and
leaves it running:

```
yarn test:e2e:stack          # start and stay in the foreground; Ctrl-C stops everything
yarn test:e2e:stack:status
yarn test:e2e:stack:down     # stop a stack, also one that is still starting
```

A stack started by a test run stops with it, even if the run is killed: each supervisor
notices within a second that the process that started it is gone, and stops its stack. What
nothing can stop is a supervisor that is itself killed outright (`kill -9`, out of memory):
the chain, bundler, paymaster and app server it started do not watch it. Where the launcher
does that itself (a stack that does not stop in time) it kills those processes first, from
the stack's `state.json`; after a kill from outside, `yarn test:e2e:stack:down` stops what is
still listening.

**The projects run in order, through Playwright's project dependencies**: `hermetic-serial`
after `hermetic`, `hermetic-timetravel` after `hermetic-serial`. Two consequences:

- A test of `hermetic` that fails (after its retries) makes Playwright skip
  `hermetic-serial` and `hermetic-timetravel` altogether ("did not run"), and a failed serial
  test skips the time travel. A red run therefore says nothing about the later projects.
- `-g`, a file path and `--grep @unverified` do not reach a project that is only run as a
  dependency. A run that selects a serial or time-travel test also runs **every** test of the
  projects before it (`playwright test --list` with the same arguments shows it). To run one
  serial or time-travel file by itself, name its project and add `--no-deps`:
  `yarn playwright test --config e2e/playwright.config.ts --project hermetic-serial --no-deps e2e/features/lock-spec`.

Logs of every process are in `e2e/.stack/logs/`. Every browser test attaches the wallet's
request log, the blocked network requests and the browser's console errors and warnings; a
failed one adds a screenshot, a trace and the last lines of the app, bundler and paymaster logs.

### Settings

| Variable | Effect |
|---|---|
| `E2E_FORK_RPC_URL` | Sepolia archive RPC that Anvil forks from. Default: the public, keyless endpoint in `env/hermetic.json`. Never commit a URL that contains a key. |
| `E2E_FORK_BLOCK` | Fork block. Default: the pinned block in `env/hermetic.json`. A different block needs its own baseline (`yarn test:e2e:baseline`). |
| `E2E_FORCE_BUILD=1` | Rebuild the app even if the build looks current. |
| `E2E_ALLOW_STALE_STACK=1` | Use a running stack although the app sources changed since it was built. |
| `E2E_RUN_SALT` | Fixes the per-run salt that test keys derive from, to reproduce a run on a fresh stack. |
| `E2E_ANVIL_BIN` | Use this anvil binary instead of the one from `e2e/aa-stack`. |
| `E2E_WORKERS` | Number of workers, 1 to 8 (in CI: 1 to 4, and no more than the runner has cores). Each gets a whole stack of its own. Default 1. See "Several workers". |
| `E2E_INCLUDE_UNVERIFIED=1` | Also run the tests tagged `@unverified`. See "Unverified specs". |
| `E2E_TEST_TIMEOUT_MS` | Time limit of one test. Default 180000. |
| `E2E_EXPECT_TIMEOUT_MS` | Time limit of an assertion or an action (click, fill) that names none. Default 30000. |

### Working on a test

The default timeouts are generous, because a failure then only takes longer to show. While
working on one test that is too long to wait for a wrong locator. Keep the stack running in
another terminal (`yarn test:e2e:stack`) and shorten both for your own runs:

```
E2E_TEST_TIMEOUT_MS=30000 E2E_EXPECT_TIMEOUT_MS=8000 yarn test:e2e -g "C3" -x
yarn test:e2e --last-failed
```

Timeouts written into a test (`{ timeout: 60_000 }` on a write's success toast) are not
changed by these. Leave `E2E_WORKERS` unset here: one test needs one stack.

## The stack

Everything listens on `127.0.0.1` on a fixed port (`env/hermetic.json`). If a port is busy the
start fails and names the port. These are the ports of the only stack of a run with one
worker; with several workers, stack `i` uses each of them plus `100 * i`.

| Port | Process | Notes |
|---|---|---|
| 13000 | The app, `next start` | Built with dummy public values, `NEXT_PUBLIC_E2E_POLL_MS` (see "Shorter waits in the tested build") and `NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS` (see "Personas"). Runs with `E2E_HERMETIC=1` and the three server-only overrides of `src/lib/e2e-overrides.ts`. |
| 18545 | Anvil 1.7.1 | Fork of Sepolia (chain id 11155111) at the pinned block, clock moved to now. |
| 14337 | alto 0.0.21 | ERC-4337 bundler for EntryPoint 0.7. It has no host flag and binds `0.0.0.0`. |
| 14338 | mock paymaster 0.0.8 | Answers `pm_*` and forwards the rest to alto. The app's `/api/aa/rpc` proxy points here. |
| 14350 | Subgraph fake | `POST /graphql`; control API under `/__control/`. |
| 14351 | S3 fake | Stands in for the Filebase bucket; also serves `/ipfs/<cid>`. |
| 14359 | Supervisor | `GET /health`, `POST /stop`. |
| 13050 | A second app server, only while a test that sets `appEnv` runs | The same build and stack, with server settings of the test's own (see "Server settings of one test"). |

The browser never leaves the machine (`support/backends/routes.ts`): the RPC host compiled
into the bundle is answered by Anvil, the IPFS gateway by the S3 fake, and every other host
(WalletConnect, PostHog, Coinbase, fonts) is aborted and listed in the test's
`blocked-requests.json` attachment. Anvil itself reads state it has not seen yet from the fork
RPC, so a run needs network access to that one endpoint.

**Fork pin.** The block is pinned so that the state is the same on every run. To move it,
change `fork.block` in `env/hermetic.json`, run `yarn test:e2e:baseline`, commit both files and
delete the old baseline.

**No revert.** The chain is shared by every test of a worker and is never reset: the app's server
caches verified senders, and the bundler does not survive a revert. Tests are isolated by fresh
keys instead. A test must only rely on state it created for its own accounts, or on totals it
read itself during the test.

**Rate limits.** The app's limits live in the server's memory and are keyed by the visitor's IP
as Cloudflare reports it (`cf-connecting-ip`, then `x-real-ip`, then the last `x-forwarded-for`
hop: `clientIp` in `src/lib/aa/rate-limit.ts`), for `/api/graphql` and `/api/aa/rpc` alike. Every
test gets its own IP in both headers (the `testIp` fixture). `/api/graphql` allows a visitor a
burst of sixty requests that refills one a second; `support/graphql-limit.ts` uses it up and
watches a page's answers (P8 to P10). One limit still applies inside a test: five
paymaster calls a minute per sender, two per sponsored send, so a persona's third sponsored
send in quick succession is refused. Split such a scenario, or seed with `chain.sendSponsored`,
which does not go through the proxy.

The limits on sponsored account creation (`SPONSORED_PROFILES_PER_IP_PER_DAY`, default one new
account per visitor IP a day, and `SPONSORED_PROFILE_INTERVAL_SECONDS`, default one every five
minutes app-wide) are **off** in the stack's app (both `0` in `APP_RUNTIME_ENV`): the app-wide
one would refuse nearly every test that creates a profile, and the daily one any test that
asks for sponsorship of a new account twice (a declined signature, then Finish again). Their
own tests run on a second app server with real values (next section).

### Server settings of one test

`test.use({ appEnv: { NAME: "value" } })` starts, for each test of that scope, a second
`next start` of the same build on the stack's `appVariant` port (13050 plus `100 * i`), with
the stack's runtime environment plus these values, and points `baseURL`, the network rules and
`api` at it. The chain, bundler, paymaster and fakes are the stack's. Only server-side values
can be given (no `NEXT_PUBLIC_*`, which the build fixes, and no `E2E_*`). The server starts
with empty in-memory counts and stops at the end of the test, which costs a few seconds; its
log is attached to a failed test. It stops by itself when the worker that started it is gone
(`support/stack/app-variant.mjs`). Used by `features/api/aa-rpc-profile-limits.api.spec.ts`
(P11 to P13) and `features/onboarding/onboarding-sponsorship-limits.spec.ts` (C17 to C19).

**Keys.** All test keys derive from the TEST-ONLY mnemonic in `env/hermetic.json`. It is
public on purpose and only ever used on the local fork. Never fund those addresses on a real
network.

### The lock on the test switches

The app has three test switches: the server-only `E2E_*` overrides
(`src/lib/e2e-overrides.ts`), the shorter waits (`src/lib/e2e-timing.ts`) and the extra legacy
accounts (`src/lib/e2e-legacy-accounts.ts`). None can be reached by a visitor: all are read
from the environment only. All three ask `src/lib/e2e-build.ts` first, which is an allowlist:
the bundle must have been built with `NEXT_PUBLIC_ENVIRONMENT=development` **and**
`NEXT_PUBLIC_E2E_BUILD=1`. Only the launcher sets that marker (`APP_BUILD_ENV`). A deployment
is never built with it, staging included (staging is also built as `development`, so the
environment name alone would not lock it), and so ignores every switch whatever else is in its
env files. The server-only overrides also need `E2E_HERMETIC=1` and the same two values in the
running server's environment. Never add `NEXT_PUBLIC_E2E_BUILD` to a deployment's env files.
The three `src/lib/e2e-*.test.ts` unit tests hold the cases.

Not confirmed by a build: that `next build` leaves `process.env.NEXT_PUBLIC_E2E_BUILD` as a
runtime read on the server when the variable is unset at build time (then a deployed server
would need the marker in its runtime environment as well as the flag, which is still two
deliberate variables more than before), and replaces it with nothing in the browser bundle.

### Shorter waits in the tested build

The app waits on fixed timers that are sized for a real network: wagmi and viem ask for a
receipt every 4 seconds, an AA10 refusal is retried after 3 seconds, the status of an EIP-5792
call is read every 3 seconds, the subgraph is asked every second. On a chain that mines at
once these are pure waiting (about 4 seconds in every sponsored write). The suite's build
sets one value, `NEXT_PUBLIC_E2E_POLL_MS=200` (`APP_BUILD_ENV` in `support/stack/config.mjs`),
and `src/lib/e2e-timing.ts` uses it in place of those intervals:

| Wait | In a deployment | In the suite's build |
|---|---|---|
| wagmi `pollingInterval` (receipts of wallet transactions, block number) | 4 s, viem's default, which wagmi passes on | 200 ms |
| Receipt of a sponsored user operation (`send-sponsored-user-operation.ts`) | 4 s, viem's default | 200 ms |
| Retry after AA10 (`AA10_RETRY_MS`) | 3 s | 200 ms |
| Status of a `wallet_sendCalls` batch (`account-capabilities.ts`) | 3 s | 200 ms |
| Subgraph sync (`useWaitForSubgraphSync`) | 1 s | 500 ms: each poll is a request to `/api/graphql`, which allows a visitor a burst of 60 that refills one a second |

The value is compiled into the bundle and ignored unless the bundle is the suite's own build
(see "The lock on the test switches"), when it is not a whole number from 50 to 1000, and when
it is unset, which it is in every deployment; it can only shorten a wait. `src/lib/e2e-timing.test.ts` holds the proof
that nothing changes without it. What this costs: the tested bundle differs from the deployed
one by these intervals, so the suite says nothing about how the app behaves while it waits
four seconds. Not shortened: the retry after a Light Account deployment
(`AFTER_DEPLOY_RETRY_MS` in `owner-pays.ts`) and viem's own retries of a failed request.

### Several workers

`E2E_WORKERS=N` (1 to 8) runs the tests with N workers. The default is 1.

Each worker gets **a whole stack of its own**: its own Anvil fork, alto, paymaster, subgraph
and S3 fakes and its own `next start`, on the ports above plus `100 * i` for worker `i`. All
app servers read the one build in `.next`; only stack 0 ever builds. Nothing is shared between
two workers except that build and the test code, so everything that is process-wide in a stack
stays private to one worker: the server's rate limits and its cache of verified senders, the
fakes' overlays, faults and request logs, the paymaster, the bundler's mempool, and the
chain's totals (badge ids, supplies, governor counts). A test may go on reading totals as
before. Tests are spread over the workers by file; the tests of one file run in order on one
worker (`fullyParallel` is off).

Why not one chain for all workers: the app server takes its chain, bundler, subgraph and S3
endpoints from its environment when it starts, so one server cannot serve two sets of fakes,
and tests that read chain totals (governance, new badge ids) would see each other's writes.

How it is put together:

- `support/stack/config.mjs` and `env/hermetic.ts` derive ports, URLs and the log directory
  from a stack index. In a Playwright worker the index is the worker's parallel index
  (`TEST_PARALLEL_INDEX`, 0 to N-1; a worker that replaces a failed one keeps the number), so
  every fixture talks to its own stack without knowing about it.
- `yarn test:e2e:stack` with `E2E_WORKERS=N` starts stack 0 and then, one after another, a
  supervisor for each further stack. The ports of all N stacks are checked before anything
  is built or started. Stopping stack 0 (Ctrl-C, `yarn test:e2e:stack:down`, the
  end of the test run) stops them all; a further stack that dies takes the set down; each
  supervisor also stops when the process that started it is gone. `stack:down` and
  `stack:status` look at all eight possible stacks, whatever `E2E_WORKERS` is at that moment.
- A test run starts as many stacks as it has workers, or uses a running set that has at least
  that many.
- Logs of stack `i` are in `e2e/.stack/stack-<i>/logs/` (stack 0: `e2e/.stack/logs/`). A
  failed test attaches the logs of its own worker's stack.

Costs: N Anvil forks read from the fork RPC, and each stack is about five processes plus a
browser. Start-up grows by one stack start per extra worker. While working on a single test,
leave it at 1. How much memory one stack takes has not been measured; until it has, do not
use more workers than the machine has cores (the CI workflow refuses more than four).

`hermetic-serial` (`*.serial.spec.ts`) still runs after `hermetic`. With several workers its
files run at the same time, each on the stack of the worker it lands on: a serial file changes
only that stack, and whatever runs on that worker afterwards sees the change. With one worker
they run one after another in file-name order. So a serial file must not rely on another
serial file having run before it, or not: each sets up what it reads.

### The subgraph fake

`support/backends/` answers the app's persisted queries from an entity store, by executing
them against the checked-in `schema.graphql`. Three sources feed the store:

1. **Baseline** (`baseline/sepolia-<block>.json`): the badges contract's history up to the fork
   block, replayed from on-chain logs. Addresses, badge names and token URIs only: profile
   metadata is not fetched from IPFS, so baseline users show as addresses.
2. **Chain follower** (`indexer.mjs`): applies the badges contract's events from the local
   chain the way the real subgraph's mappings do. A write made by a test or a persona shows up
   in the next query, and `_meta.block.number` reports a block only once its events are applied.
   Metadata of a new profile or badge is read from the S3 fake.
3. **Overlays**: operations a test pushes with `subgraph.overlay(...)`, dropped before the next
   test.

**The query gateway.** Before it answers, the fake refuses what the real query gateway in
front of the subgraph refuses: a document that is not in the gateway's registry, and variables
outside the operation's `variablePolicy` (filter keys, depth, sorts, sizes). It answers those
with the gateway's 400 and its message, records `refused` in `subgraph.requests()`, and
`/api/graphql` passes the refusal on as a 400. The policy is a committed snapshot of the
gateway's registry; [backends/gateway/README.md](support/backends/gateway/README.md) says
where it comes from and how to refresh it. A test that seeds variables of its own must use
values the gateway allows (a sort the app offers, for instance, not `orderBy: "id"` on Users).

The follower is an imitation. It proves that the UI renders the state a write should produce,
not that the real subgraph indexes it; only `live` can prove that. It knows the badges contract
only. Communities, the auction, Lock SPEC and community activities are not followed and are not
in the baseline: seed them with overlays, or add handlers to `indexer.mjs` together with the
feature's tests. The tests of those areas play the indexer themselves, with real data: they
read what a transaction did from its events or from the chain and push it as an overlay,
usually while `_meta` is frozen so that the page reads it only afterwards
(`features/community-detail/steps.ts`, `features/auction/steps.ts`,
`support/builders/lock-spec.ts`). Such a test proves the transaction, its route and the
page's refetch, not indexing.

### alto's licence

`@pimlico/alto` is GPL-3.0-or-later. The suite never imports it: it is started as a separate
process (`support/chain/aa-stack.mjs`) and spoken to over HTTP. It is installed from its own
package, `e2e/aa-stack`, with its own lockfile, so that it and its several hundred dependencies
stay out of the app's `yarn.lock` and out of the app's bundle. Keep it that way: do not add
alto to the root `package.json` and do not import from it.

## Layout

```
e2e/
  playwright.config.ts        projects: api, hermetic, hermetic-serial, hermetic-timetravel, extension, live
  global-setup.ts             starts the stack (or finds a running one), stops it afterwards
  fixtures.ts                 `test` and `expect` for every hermetic and api spec
  features/<area>/            specs, and SCENARIOS.md: the area's list of scenarios
  features/stack/             checks of the foundation itself: wallet fixture, personas, route helpers
  _template/feature.spec.ts   start a new spec from this
  env/                        hermetic.json (+ .ts): ports, fork pin, test mnemonic; staging.ts
  support/
    wallet/                   the injected EIP-1193 / EIP-6963 test wallet, test keys
    chain/                    Chain (reads and seeding), and the anvil / alto / paymaster launcher
    aa/                       what the page sent to /api/aa/rpc, and answers to give in the proxy's place
    backends/                 subgraph fake, S3 fake, network rules, their test-side clients
    builders/                 typed builders for subgraph overlays, and seeding steps of one area
    pages/                    page objects
    flows/                    steps that scenarios of several areas start with (openWizard, reachReview)
    personas.ts               the kinds of user a scenario starts from
    app-variant.ts            a second app server with server settings of one test (`appEnv`)
    stack/                    the launcher: config, processes, app build and start, CLI
    ci/                       which tests a pull request runs
  aa-stack/                   package.json + lockfile for anvil, alto and the mock paymaster
  live/  extension/           placeholders
```

Areas: `shell`, `connect`, `onboarding`, `profile`, `referrals`, `accounts`, `badges`,
`badge-actions`, `badge-create`, `communities`, `community-detail`, `governance`, `auction`,
`lock-spec`, `tx-failures`, `api`.

## Writing a test

Copy `_template/feature.spec.ts` into the area's folder. The file name picks the project:
`*.spec.ts` is `hermetic`, `*.api.spec.ts` is `api`, `*.serial.spec.ts` is `hermetic-serial`,
`*.timetravel.spec.ts` is `hermetic-timetravel`.

```ts
import { expect, test } from "../../fixtures";

test("C3: a new user creates a profile with sponsored gas", { tag: ["@smoke", "@sponsored"] },
  async ({ persona, pages, wallet, chain }) => {
    const me = await persona("new");
    await pages.onboarding.open();
    await pages.shell.connect();
    // ...
    expect(wallet.sendTransactionRequests()).toHaveLength(0);
    expect(await chain.profileBadgeId(me.address)).toBeGreaterThan(BigInt(0));
  });
```

- **Title:** starts with the scenario ID from the area's `SCENARIOS.md`.
- **Tags:** in the details object. One of `@smoke`, `@core`, `@edge`; the write route if there
  is one (`@sponsored` when Society pays, `@owner-tx` when the wallet pays); `@unverified` for
  a test that has never been run (next section). There is no tag for a flaky test: nothing
  would act on it. Find the wait that is missing instead.
- **Locators:** role, label or text first, then `data-testid="<feature>-<element>"`. Never the
  CSS structure. A new control gets an accessible name or a test id in the same pull request.
- **No sleeps.** Wait for what the user would see. To look at the app while the wallet is
  "open", hold the prompt: `const prompt = wallet.holdNext("signature")`, then
  `await prompt.requested`, assert, `prompt.approve()`.
- **App code in tests:** import pure modules only (`src/abis`, `src/consts`,
  `src/lib/smart-account`). Anything that imports `src/lib/env` throws outside the app.

### Unverified specs

A spec that was written without being run (the machine was busy, the stack was down) is
tagged `@unverified`, on the `test.describe` or on each test:

```ts
test.describe("profile", { tag: "@unverified" }, () => { /* ... */ });
```

Tests with that tag are left out of every run: `yarn test:e2e`, the smoke run and CI, also
when the pull request changed their file and also when `--grep` or `--grep-invert` is given
on the command line (the filter is in the config, and Playwright applies both). They are in
the repository so that they can be reviewed and then proven:

```
yarn test:e2e:unverified                                     # all of them
yarn test:e2e:unverified e2e/features/profile                # one area
E2E_INCLUDE_UNVERIFIED=1 yarn test:e2e                       # everything, verified or not
```

When a test passes (or fails for a reason that is an app bug, and is then marked
`test.fail` with the reason), remove the tag in the same commit. An `@unverified` test must
not count towards the definition of done, and a `@smoke` tag next to it has no effect until
the tag is gone.

### Known app bugs

A test of behaviour that is broken in the app is written as it should be and marked
`test.fail(true, "<reason>")` right above the assertions that fail, with the cause in a
comment. It then fails as expected, and turns red the day the bug is fixed. Give those
assertions a short, explicit timeout, so that the known failure does not cost a long wait: 2
seconds when a fixed app would have the state on screen already, 5 seconds when it would
need a request or a navigation first. Not shorter: an assertion that gives up before a fixed
app can answer would hide the fix. Remove the timeout together with `test.fail`.

A shared step never retries its way around a known bug: that would hide it, and any
regression of the same kind, in every test that uses the step. It waits for the state in
which a user is not affected instead, and then acts once. Example: a click on "Setup your
Account" made while the page still has a URL write pending is undone (C16), so
`pages.onboarding.start()` first waits until nuqs has none (`waitForUrlWritesToSettle`).

Only real defects are expected failures. A scenario row the app never implemented, or one
that may be out of date, is `test.fixme` with "owner to decide" until the owner has said which
side changes (A5, A11).

### Fixtures

| Fixture | What it is |
|---|---|
| `persona(kind, options?)` | A fresh user of that kind, seeded on chain, and made the wallet's account. Returns a `Persona`. |
| `actor(kind, options?)` | The same without touching the wallet: someone else in the scenario. |
| `wallet` | The injected test wallet (`TestWallet`): controls and the request log. |
| `aa` | `AaTraffic`: what the page sent to `/api/aa/rpc` and what came back. `userOperations()`, `paymasterCalls()`, `refusedCalls()`, `methods()`, `clear()`; `answer(...)` refuses calls in the proxy's place. See "The wallet" and "Sponsorship that is refused". |
| `chain` | `Chain`: reads for assertions, writes for seeding. |
| `subgraph` | `SubgraphFake`: `overlay`, `injectFaults`, `clearFaults`, `setMeta`, `unfreeze`, `entity`, `entities`, `holdersOf`, `requests`. |
| `s3` | `S3Fake`: `putJson`, `put` (any body, with its content type: a picture), `getJson`, `get`, `failNext`, `requests`. |
| `pages` | Page objects (`support/pages/index.ts`): `shell`, `navigation`, `connectWallet`, `onboarding`, `profile` (also its edit form), `profileDetails`, `referrals`, `accounts`, `badge`, `badgesList`, `badgeDetail`, `badgeActions`, `badgeCreate`, `badgeEdit`, `communities`, `communityCreate`, `communityDetail`, `governance`, `governanceContent`, `auction`, `lockSpec`. All but `shell` take only the page, and many specs build theirs with `new AccountsPage(page)`; both are the same thing. |
| `api` | `APIRequestContext` on the app, sending this test's IP. |
| `graphql(operation, variables?)` | Runs one of the app's persisted queries through `/api/graphql`. |
| `nextAccount()` | A new test key on every call. |
| `network` | `blocked`: the URLs the page tried to reach outside the stack. `failRpc(match)` and `holdRpc(match)`: make the page's own chain reads fail or wait (see "Chain reads that fail"). |
| `seenText` | `SeenText`: every text the pages have shown, including toasts and notices that are gone again. `all()`, `matching(pattern)`. For "the app never said X during this flow", and for text that is on screen too briefly for a locator. |
| `browserErrors` | Uncaught exceptions and console errors of the page. |
| `testIp` | This test's client IP. |
| `appVariant` | With the `appEnv` option: the test's second app server (`url`, `log()`); undefined otherwise. See "Server settings of one test". |

Options, set with `test.use({ ... })`: `walletIdentity: "metamask" | "generic"`,
`walletCapabilities: "none" | "atomic"` and `appEnv` (server settings of a second app server,
see "Server settings of one test").

### Personas

| Kind | State |
|---|---|
| `new` | Nothing: no ETH, no Light Account on chain, no profile. |
| `newFunded` | `new`, and the owner wallet holds 10 ETH. |
| `member` | A profile, created by a sponsored user operation that also deployed the Light Account. |
| `fundedMember` | `member`, and the owner wallet holds 10 ETH. |
| `governor` | `fundedMember` whose Society address holds the Governor badge (#69 on Sepolia). |
| `badgeMinter` | `fundedMember` that may mint `persona.badge`, a new badge that already has one holder, `persona.holder`. |
| `officialBadgeCreator` | `fundedMember` whose Society address holds `OFFICIAL_BADGE_CREATOR_ROLE`, granted by the role's admin on the fork. |
| `communityManager` | `fundedMember` whose Society address manages `persona.community`, created on chain through the CommunityRegistry. The Community entity in the fake is an overlay, so it lasts for the test that made the persona. Run by I5 in `badge-create`. |
| `legacy` | A member from before smart accounts: the wallet holds a profile, created by the wallet; its Society address has none and is not deployed. See below. |
| `contractWallet`, `eip7702` | Not implemented: they throw an error that says what is missing. |

A `Persona` has `owner` (the key), `ownerAddress` (the wallet), `address` (the Society address,
which is the Light Account) and, when it has one, `profile { badgeId, name, bio, uri }`.

Personas write real state through real contract calls, and the subgraph fake follows the chain,
so a persona needs no overlay. The Light Account never holds ETH: writes that are not sponsored
are paid by the owner wallet, which is why the personas that make such writes have a funded
owner. A new role or contract comes with a seed step in `support/personas.ts` (and, if the UI
reads it from the subgraph, a handler in `indexer.mjs` or a builder).

**The legacy persona.** The app pairs an old wallet with its Society address through a map
that is compiled into the bundle (`src/consts/legacy-account-map.json`). Test wallets must not
be in the committed map: they come from a public mnemonic. So the suite's build adds a fixed
pool of sixteen test wallets to the map through `NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS`
(`legacyAccounts.pairs` in `env/hermetic.json`, read by `src/lib/e2e-legacy-accounts.ts`,
ignored by every build but the suite's own and unset in every deployment). `persona("legacy")` takes the
first wallet of the pool whose Society address has no profile yet. A test that gives the
Society address a profile (C11) uses that wallet up for the life of the chain; when all
sixteen are used the persona says so, and the stack has to be restarted.

`chain` seeds what a persona does not: `mintBadge` and `burnBadge` act as an account the
contract lets mint or burn the badge on the fork, `createBadge` creates one as any account
(impersonated), `grantBadgesRole` grants a role as its admin, `writeBadgesAs` makes any call of
the badges contract as any account, `sendAs` any call of any contract, and
`setErc20Balance(token, holder, amount)` gives an address a token balance by writing the
token's storage (SPEC and the auction's bidding token sit on the owner wallet, not on the
Society account). Seeding steps that belong to one area are in `support/builders/`:
`community-detail-seed.ts` (a community on chain and in the fake, members, assistants),
`referrals.ts` (signed invites, accepted invites), `auction.ts` and `lock-spec.ts`.

### The wallet

`wallet` is an EIP-1193 provider injected into every page and announced through EIP-6963. By
default it presents itself as MetaMask, so RainbowKit lists it as its built-in MetaMask entry
and connects through wagmi's MetaMask connector. With `walletIdentity: "generic"` it is a
wallet RainbowKit has never heard of, listed under "Installed". `pages.shell.connect()` picks
whichever it is.

| Control | Effect |
|---|---|
| `rejectNextSignature(n)`, `rejectNextTransaction(n)`, `rejectNextConnection(n)`, `rejectNextChainSwitch(n)` | The next `n` prompts of that kind fail with code 4001. |
| `holdNext(kind)` | Keeps the next prompt open until `approve()` or `reject()`; `requested` resolves when the app has asked. |
| `setResponseDelay(ms)` | Every prompt waits that long first. |
| `setChainId(id)` | Switches the wallet's network and emits `chainChanged` (wrong-network cases). |
| `setAccount(account)` | Switches the account and emits `accountsChanged`. |
| `disconnect()` | The user disconnects the site: `accountsChanged` with no accounts. |
| `emitProviderDisconnect()`, `emitProviderConnect()` | The raw EIP-1193 `disconnect` / `connect` events. |
| `setCapabilities("atomic")` | Answer EIP-5792 (`wallet_sendCalls`). The calls are sent one after another, not as a real atomic batch. |
| `setAllowSendTransaction(false)` | Refuse transactions and record them as `refused`. |
| `stopAnswering(method)` | Every request of that method stays unanswered (a hung wallet) until the handle's `release()`; `hits()` counts them. Released after each test. |

The request log is how a test knows who paid. `wallet.requests` holds every request with its
outcome (`ok`, `error`, `rejected`, `refused`); `signatureRequests()`,
`sendTransactionRequests()`, `sendCallsRequests()` and `requestsOf(method)` filter it;
`clearRequests()` empties it. Routes as of this writing (read `src/lib/outpost-routing.ts`):

- **Sponsored** (`createProfile`, `updateProfileURI`, `acceptInvite`): signatures only, zero
  `eth_sendTransaction`.
- **Owner pays through the account** (other Outpost writes, or a sponsored write whose
  sponsorship was refused before the signature): one `eth_sendTransaction`, or two when the
  Light Account must be deployed first. No signature.
- **Owner** (calls only the wallet may make, calls with ETH, other contracts): one
  `eth_sendTransaction`, or one `wallet_sendCalls` in EIP-5792 mode.

A sent `eth_sendTransaction` carries the transaction's `hash` in the log, to get from the
request to its receipt. For the second route, `expectOwnerPaidThroughAccount` in
`support/write-route.ts` checks the log, the transaction's sender and target, that the owner
wallet paid exactly its fee and that the Light Account holds no ETH, and returns the receipt.
Pass `signatures: 1` when the action signs an upload authentication first (a profile save whose
sponsorship was refused), and `deploysAccount: true` when the Light Account did not exist: it
then also checks the first transaction, `createAccount` on the factory. For the third route,
`expectOwnerSentDirectly` checks that the one transaction went from the wallet straight to the
contract. For a write that first approves an ERC-20 token (a bid in the auction, a SPEC lock),
`expectOwnerApprovedThenSent` checks the two transactions, approval and action, the same way.

No route funds the Light Account, and the app must never ask the user to.
`expectNeverAskedToFundSocietyAccount(seenText, persona, { saw })` fails if any text the pages
showed during the test, even for a moment, puts ETH and the Society account (by name or by
address) in one sentence. `saw` is a text the flow is known to have shown; it proves that the
recorder was running. End every test of a write with it.

The wallet log says what the user approved; the `aa` fixture says what the page then sent to
the account-abstraction proxy. For the sponsored route, `expectSponsoredThroughAccount` (same
file) checks both: the expected number of approved signatures and no transaction, exactly one
user operation whose sender is the Light Account and which has a paymaster, and that neither
the owner wallet nor the Light Account paid. It returns the user operation;
`badgesCallOf(userOperation)` and `deploysSender(userOperation)` in `support/aa/traffic.ts`
say which badges function it calls and whether it carries the Light Account factory. Call
`wallet.clearRequests()` and `aa.clear()` right before the action.

### Subgraph overlays and faults

For state the chain follower does not produce (communities, the auction, names of baseline
users, edge cases), push overlay operations built with `support/builders/entities.ts`:

```ts
import { badge, link, memberWithProfile, newBadge } from "../../support/builders/entities";

await subgraph.overlay(
  memberWithProfile({ address, profileBadgeId: "9001", name: "Ada" }),
  newBadge({ id: "9002", name: "Early Member", createdBy: address, fields: { holdersCount: "1" } }),
  link("User", address, "badges", ["9002"]),      // Ada holds it
  badge("69", { name: "Renamed" }),               // change a field of a badge that exists
);
```

Entities have the shape of the subgraph's own schema: a reference is the other entity's id, a
list of references is an array of ids, BigInt values are decimal strings, user ids are
lowercase addresses. Derived fields (`Badge.holders`, `Badge.managers`, `Community.members`,
`Community.badges`, `User.invitedUsers`) are computed from the other side and never stored.
`upsert(type, id, fields)` works for any entity type of the schema; `newBadge` and
`newCommunity` also create the entities the schema requires next to them (a badge's creator, a
community's manager and manager badge). The fake enforces the schema: a missing required field
is a GraphQL error, which the app shows as "GraphQL upstream request failed"; the field's name
is in `(await subgraph.requests()).at(-1)?.errors`. An overlay is rendering only: if the UI
also reads the chain for the same thing (balances, permissions), seed the chain.

Failures: `subgraph.injectFaults({ kind: "http-error", operation: "User" })` (also
`graphql-error`, `invalid-json`, `delay`), `s3.failNext(10)` to fail a pin (the AWS SDK retries
a failed upload a few times, so fail several; `s3.failNext(0)` ends it). A subgraph fault
fails ONE request unless it has a `count`; the app's queries retry three times, so an error
state on screen needs `count: 5` or more. `subgraph.clearFaults()` ends the faults and keeps
the overlays ("the subgraph is back": Retry).

A subgraph that is behind comes in two forms. `subgraph.setMeta({ freeze: true })` stops only
`_meta`, so the app's "wait for the subgraph" does not complete, while queries already see the
write: use it to hold the app in "Syncing...". `subgraph.setMeta({ stall: true })` stops
indexing altogether, like a real subgraph that has fallen behind: `_meta` and the entities both
stay where they are. `subgraph.unfreeze()` ends either, and so does the next test.

### Sponsorship that is refused

The local paymaster sponsors everything it is asked for, so most refusals are answers given in
the proxy's place:

```ts
import { ALREADY_DEPLOYED, BUNDLER_REJECTIONS, REFUSALS } from "../../support/aa/refusals";

const refused = await aa.answer(REFUSALS.policyExhausted);       // until refused.lift()
await aa.answer(BUNDLER_REJECTIONS.nonceInUse);                  // eth_sendUserOperation only
await aa.answer(ALREADY_DEPLOYED, { times: 1 });                 // the first gas estimate only
expect(refused.hits()).toBeGreaterThan(0);
```

An answer names the JSON-RPC methods it applies to (all of them when left out) and is a JSON-RPC
error with HTTP 200, or any other response with `status` and `body`. Calls it does not answer go
on to the real proxy. `aa.refusedCalls()` lists every call that came back with an error, stubbed
or real, with the error.

What the app does depends on when the failure comes (`src/lib/outpost-send.ts`):

- **Before the wallet is asked to sign the user operation** (`REFUSALS`): the owner wallet pays
  instead, through the Light Account, after the notice `pages.shell.sponsorshipFallbackNotice`.
  Hold the payment with `wallet.holdNext("transaction")` to read the notice. If the Light
  Account is not deployed, the wallet is asked twice (`deploysAccount: true`). If the wallet
  has no ETH, or the call would revert, nothing is sent and an error says why.
- **After it** (`BUNDLER_REJECTIONS`), or when the user declines: an error toast and nothing else.

The notices and errors of a wallet-paid write name its cost ("about 0.00007 ETH"). While the
wallet prompt is held nothing is mined, so the test can price the waiting transaction itself and
compare: `lastTransactionAsked(wallet)`, `expectedCost(chain, transaction)` and `shownEth(wei)`
in `support/write-route.ts`; `amountNamed(message)` reads the amount back out of a message.

`refusals.ts` says which answers are copies of the proxy's own wording and which are modelled on
Pimlico and the bundler without having been recorded. The proxy's two rate limits are real
in the stack: `features/api/aa-rpc.api.spec.ts` (P7) and O15 in
`features/tx-failures/sponsorship-refused.spec.ts` use them up with requests built by
`support/aa/requests.ts` and compare the real answer with the copy. So are the limits on
sponsored account creation, on a second app server (P11 to P13, C17 to C19). A refusal with
code -32005 reaches the page up to four times: viem's transport repeats a "limit exceeded"
call three times before the app sees the error.

A two-step write shows "Step 1 of 2: ..." and "Step 2 of 2: ..." in
`pages.shell.transactionStepNotice`. The second goes away early at the moment (an app bug, see
I7 in `features/badge-create`), so read it with `seenText.matching(/^Step 2 of 2/)`.

### Chain reads that fail

The page reads the chain itself (balances, total supplies, permissions), batched into
Multicall3 calls. To see what it shows when such a read fails or is slow:

```ts
const call = encodeFunctionData({ abi, functionName: "totalSupply", args: [badgeId] });
const fault = network.failRpc({ method: "eth_call", dataIncludes: call });   // answered with an error
const slow = network.holdRpc({ method: "eth_call", dataIncludes: call });    // waits until slow.release()
```

`dataIncludes` matches anywhere in the call data, so it finds a call inside a Multicall3 batch;
the whole batch then fails or waits. `hits()` says how many requests were caught. Only the
browser's requests are affected, not the wallet's and not the app server's. Release a held
read within a few seconds: the app's client gives up on a request after ten. Faults end with
the test.

### Waits that are built into the app

Some behaviour only shows after a fixed time: the app waits up to two minutes for the subgraph,
and the server refuses an upload signature that is more than five minutes old. Do not wait for
it and do not stub it: take over the page's clock.

```ts
await page.clock.install();              // before the first goto; time still runs
// ... act until the app is waiting ...
await page.clock.fastForward(121_000);   // the two minutes are over
```

`page.clock.install({ time })` starts the page at another time (a device whose clock is wrong),
and `page.clock.setSystemTime(new Date())` puts it right again. Only the page is affected: the
app server, the chain and the test keep real time.

## Coverage

Scenario IDs are those of each area's `SCENARIOS.md`. **Verified** tests have run and are part
of every run: 367 tests. 43 of them are expected to fail on confirmed app bugs (30 in the
committed build; the other 13 are auction tests that only run in a build with an auction id),
and 2 are `test.fixme` until the owner decides on a scenario the app never implemented (A5,
A11). In the committed build 15 auction tests skip themselves (see M below), so a default run
reports 320 passed, 30 failed as expected and 17 skipped. No test is `@unverified` at the
moment; a new one would be listed in the fourth column until someone has run it (see
"Unverified specs"). The last column is what no test covers.

| Area | Folder | Verified | Written, unverified | Not written, and why |
|---|---|---|---|---|
| A Shell, navigation, static content | `shell` | 19 tests: A1 to A9, A10 (Welcome card), A11 (one A5 and one A11 test are fixme: the "What is this?" copy and the X/Discord links, the owner's decision) | – | A10 hero video: `NEXT_PUBLIC_HERO_VIDEO_URL` is a build-time value and the suite's build leaves it empty; it needs a second build and a served video. |
| B Wallet connection and network | `connect` | 20 tests: B-1 to B-9, B-12 to B-15; B-10 and B-11 identity only | – | Writes as a contract wallet (ERC-1271) or a 7702 wallet: the test wallet signs as a plain key, the `contractWallet` and `eip7702` personas do not exist. Real MetaMask: the `extension` layer. WalletConnect, Coinbase, Safe: no layer. |
| C Onboarding | `onboarding` | 22 tests: C1 to C19 (C16, a click while the wallet is read, is an expected failure) | – | A profile signature by another key through the UI (C13): the wallet signs with its own key; the route's answer is P4. |
| D Profile view and edit | `profile` | 7 tests: D1 to D4, D7; D5 (as G8 in `badges`), D6 (in `tx-failures`) | – | – |
| E Invites and referrals | `referrals` | 15 tests: E1 to E10 (E6 circular invitation is an expected failure) | – | E11 (a legacy inviter): by reading it is the same path as E2 and E5, so no test claims it. The "Invitation Accepted!" label of E5: whether it is ever painted could not be settled by reading. |
| F Accounts directory, public profiles | `accounts` | 19 tests: F1 to F12 (F1 to F5 fail on the /api/graphql rate limit, one F7 on its own bug: expected failures) | – | – |
| G Badges: list, page, amounts | `badges` | 26 tests: G1 to G12 (G3 typing into Created by and G11 logged out are expected failures) | – | G12 with only `totalSupply` failing. |
| H Mint, burn, transfer | `badge-actions` | 23 tests: H1 to H18 (H4 over 2 MB is an expected failure) | – | H12 declined signature: a mint asks for none. H13 for Burn. |
| I Badge create and edit | `badge-create` | 18 tests: I1 to I10 (I2 and I5 on the I7 redirect bug, I6 image preview and both I7: expected failures) | – | What I5 asserts after its expected failure needs CommunityRegistry handlers in the fake. |
| J Communities: list, creation | `communities` | 17 tests: J1 to J8 (the J8 step-2 notice is an expected failure) | – | – |
| K Community detail, members, settings | `community-detail` | 21 tests: K1 to K13 (K9 "1 holders" is an expected failure) | – | K7 transfer: the registry's member and assistant badges have no transferers. K11 for the assistant badge: the same dialog as the two that are covered. |
| L Governance | `governance` | 8 tests: L1 to L7 | – | – |
| M Auction | `auction` | 16 tests: M1 to M10. As committed only M1 runs: M2 to M10 skip themselves until `auction.id` is set in `env/hermetic.json`, and M1 skips itself once it is. M2 to M10 were run in a local build with `auction.id` 7: two M2 tests and all eleven of M3 to M10 are expected failures, the latter because the page of a running auction crashes, so their steps after the page opens have never run. | – | Bid statuses other than "Placed": the app never shows them. |
| N Lock SPEC | `lock-spec` | 10 tests: N1 to N8 (N6 in `hermetic-timetravel`) | – | N4 "the community tier reflects it": a wallet's own lock names no community, and no page shows a tier that results from it. |
| O Transactions that fail | `tx-failures` | 25 tests: O1 to O8, O10 to O15, D6; O9 sponsored label; O9 wallet-paid label (as H1, H11); O16 to O19, who pays as the page says it (`payment-label.spec.ts`) | – | O4 with two real saves at once: whether the bundler answers AA25 or queues cannot be known without a run. |
| P Server routes | `api` | 78 tests: P1 to P13 | – | The proxy's daily limits for profile updates and invites. |
| Q Forum | – | – | – | A separate origin (the Discourse plugin); not hermetic. A `live` journey. |
| The foundation itself | `stack` | 23 tests: wallet fixture (FX), route helpers (RC), personas (PS), the subgraph fake (SG-1 to SG-4) | – | – |

Every expected failure was seen failing at its marked assertion in a run. One suspected bug
is not marked: M6's bid that may not be placed by itself after the approval
(`useBidMutation`), found by reading only. No run reaches it, because the running auction's
page crashes first; M6 is an expected failure on that crash. Once the crash is fixed, run M6:
if it then fails at "the wallet is asked for the bid", mark that with `test.fail`.

### What this branch changes in the app

Almost everything outside `e2e/` is inert in a deployment: `data-testid` and `data-*`
attributes, optional `testId` props, and the three test switches behind their lock (see "The
lock on the test switches"). These are not, and are meant:

| Change | Where | Why |
|---|---|---|
| The phone drawer only opens below the `md` breakpoint. On a wide screen it was an open modal hidden by CSS, which marked the rest of the page `aria-hidden` and trapped focus. | `src/components/Sidebar/Sidebar.tsx` | Role locators (and screen readers) could not see the page. On a phone whose drawer is open at the first render it now opens one render later. |
| `aria-label` on the header's menu button and on the toast's close button. | `Header.tsx`, `src/app/providers.tsx` | Controls need an accessible name. |
| The toast's message is wrapped in a `span`; the step notice of a transaction is enqueued as an element, not a string. | `Snackbar.tsx`, `useTransaction.tsx` | Test ids on toasts. No visible difference by reading. |
| Two `eslint-disable-next-line` comments, with the reason. | `Auction/CountDown.tsx`, `LockSpec/useCurrentLock.ts` | `yarn lint` (now in CI) fails on these two lines of `staging`. Their behaviour is left exactly as it is; a real fix is an app change for its own pull request. |

Say so in the pull request: this branch is not test-only.

## CI

`.github/workflows/e2e.yml` runs the suite on `ubuntu-24.04` without any secret, so it also
runs for pull requests from forks. It never deploys anything itself.

| Event | Tests |
|---|---|
| Pull request | The `@smoke` tests, plus every test of a spec file the pull request added or changed (`support/ci/pr-grep.mjs` turns the changed files into one `--grep`). |
| Push to `main` or `staging` | Everything. Started by `deploy-aws.yml` (see "Tests before a deploy"), not by a trigger of its own. |
| Run by hand (`workflow_dispatch`) | Everything, with the number of workers you enter. |

`@unverified` tests run in none of them. A pull request that changes only app code or the
suite's support code runs the smoke tests only; the full set follows on the push to `main`
or `staging`, before that commit is deployed. Cached
between runs: yarn's download cache, `e2e/aa-stack/node_modules`, Chromium
(`~/.cache/ms-playwright`) and the Next compiler cache (`.next/cache`). The app is still
built from the commit's sources every time. A failed run keeps the HTML report and the
stack's logs for a week. In CI a failed test is retried twice, except in
`hermetic-timetravel`, which is never retried: after its clock jump the stack cannot sponsor
writes any more, so a retry could only fail again, on its own persona seeding. Retries in CI
make a test that passes on the second try "flaky" in the report; read those, they are not
green.

There is no sharding: every shard would build the app again, and one runner has the cores
for a few workers with a stack each. `E2E_WORKERS` stays at 1 in CI until several workers
have been proven green there (run the workflow by hand with a number to try it). The
workflow takes 1 to 4 and no more than the runner has cores (`ubuntu-24.04` on a public
repository has four); more would show up as timeouts and killed processes that look like
flaky tests.

The projects depend on each other (see "Run it"), so one test of `hermetic` that stays red
skips `hermetic-serial` and `hermetic-timetravel` in that run, and the commit is not deployed.

### Tests before a deploy

`.github/workflows/deploy-aws.yml` is the only workflow a push to `main` or `staging` starts.
It calls `ci.yml` (lint, type-check, unit tests) and `e2e.yml` (this suite, every test) as
reusable workflows on the pushed commit, and its deploy job runs only when both succeed for
that same commit. A red, cancelled or skipped test run means no deploy; nothing is deployed
untested, and there is no way to skip the tests for a push. `ci.yml` and `e2e.yml` keep their
own `pull_request` trigger, so a pull request still gets both, without a deploy.

- **Pull requests** cancel their older runs when a new commit is pushed to them.
- **Pushes** are never cancelled once their tests have started, so every pushed commit gets a
  verdict. While one push's tests run, a second push to the same branch waits; a third
  replaces the second in that queue, and the replaced commit is not deployed.
- **Only the branch tip deploys.** When its tests pass, the deploy job first checks that the
  commit is still the tip of its branch. If the branch has moved on, it skips the deploy
  (a notice in the run says so): the newer commit deploys after its own tests pass, and an
  older one never overwrites it. If the newer commit's tests fail, the box keeps the last
  version that passed.
- **One deploy per branch at a time**, never cancelled half-way; a newer deploy of the same
  branch waits for the running one. `main` (prod) and `staging` deploy independently, and
  the two builds take turns on the shared box (a lock in `.github/scripts/deploy-outpost.sh`).

The workflows use the action versions the repository already used (`actions/checkout@v4`
and so on). Pinning each action to a commit is left to do: it needs a look at the actions'
repositories.

## Definition of done for a feature pull request

1. The feature's scenarios are rows (ID, persona, needs, tag) in the area's `SCENARIOS.md`.
2. At least one `@smoke` happy path and one failure or guard path run in `hermetic`.
3. Every new write asserts the wallet's request log and a chain read.
4. A new persisted query works against the fake: a baseline or builder for its entities, and a
   test that runs it. A new role or contract comes with a seed step that writes the chain.
5. New controls have an accessible name or a test id.
6. Anything that touches the Pimlico policy, the subgraph schema or the forum adds a `live`
   journey (once that layer exists).
7. No sleeps and no CSS-structure locators.
8. `yarn lint`, `yarn type-check` and `yarn test:e2e` pass.

## Troubleshooting

- **"port ... is already in use"**: an earlier stack is still up (`yarn test:e2e:stack:down`),
  or something else owns the port (`lsof -nP -iTCP:<port> -sTCP:LISTEN`).
- **"serves a build of older app sources"**: the running stack was built before you changed
  `src/`. Stop it and run again.
- **Anvil exits at start**: the fork RPC is unreachable or does not serve the pinned block.
  See `e2e/.stack/logs/anvil.log`; set `E2E_FORK_RPC_URL` to an archive endpoint.
- **A sponsored write falls back to the wallet paying**: the proxy refused it. Look for
  "Too many sponsorship requests" (the per-sender limit above) in the test's
  `browser-console.txt` attachment, or for the call's `error` in `aa-rpc-calls.json`.
- **"has 1 stack(s), and this run has N workers"**: a stack is already running with fewer
  stacks than the run has workers. Stop it, or start it with the same `E2E_WORKERS`.
- **A worker's tests all fail with a connection error**: its stack went away. See
  `e2e/.stack/stack-<i>/logs/supervisor.log`; `yarn test:e2e:stack:down` clears what is left.
