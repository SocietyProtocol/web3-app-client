# live

Not implemented yet. This folder is the `live` project of `e2e/playwright.config.ts`: a small
set of journeys (8 to 10) against the deployed staging app on real Sepolia. It exists to prove
what the hermetic layer cannot:

- the real Pimlico sponsorship policy, and its real gas numbers against the caps in `src/lib/aa/limits.ts`;
- ERC-7562 validation by a real bundler;
- the real subgraph indexing a write (the hermetic layer only imitates it);
- Filebase pinning, and the forum's sign-in.

Planned shape: specs in this folder named `*.spec.ts`, importing their own fixtures (the
hermetic fixtures in `e2e/fixtures.ts` talk to the local stack and do not apply here). Public
addresses go in `e2e/env/staging.ts`; the app's address does not: it comes from
`E2E_LIVE_BASE_URL`, which has no default (`requireLiveBaseUrl()`), so a live run never points
at a real environment by accident. A funded test key comes from a gitignored
`.env.e2e.local` or a CI secret, never from a committed file.

Running `playwright test --project live` today finds no tests and exits with "No tests found".
