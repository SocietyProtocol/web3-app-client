# extension

Not implemented yet. This folder is the `extension` project of `e2e/playwright.config.ts`:
about five tests with the real MetaMask extension (through Dappwright), Chromium only. It
exists to prove what the injected test wallet cannot: the real picker and popups, a real chain
switch, one real transaction, one real rejection and one `wallet_sendCalls` batch.

The injected wallet in `e2e/support/wallet/` imitates an EIP-1193 provider. It says nothing
about MetaMask's own behaviour, including its EIP-5792 batching and EIP-7702 upgrade.

Running `playwright test --project extension` today finds no tests and exits with "No tests found".
