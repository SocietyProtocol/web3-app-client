import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { URLS, workersFromEnv } from "./env/hermetic";
import { STAGING } from "./env/staging";

/**
 * Outpost browser tests. See e2e/README.md.
 *
 *   yarn test:e2e          api + hermetic + hermetic-serial + hermetic-timetravel
 *   yarn test:e2e:smoke    the @smoke tests of those projects
 *   yarn test:e2e:api      the route contracts only
 *
 * Tests tagged @unverified are left out of all three unless
 * E2E_INCLUDE_UNVERIFIED=1 (see "Unverified specs" in e2e/README.md).
 *
 * Projects:
 *   api              Playwright `request`, no browser: contracts of the Next API routes
 *   hermetic         the production build with an injected wallet, on a local chain,
 *                    bundler, paymaster and fake subgraph / S3
 *   hermetic-serial  tests that change state other tests read (role holders,
 *                    auction); run after `hermetic`. With several workers its
 *                    files run at the same time, each on its worker's own
 *                    stack, so no serial file may rely on another having run
 *   hermetic-timetravel  tests that move the chain's clock forward, which is
 *                    never put back; run after everything else, never retried
 *   extension        real MetaMask (not implemented yet, see extension/README.md)
 *   live             deployed staging on real Sepolia (not implemented yet, see live/README.md)
 */
const isCI = !!process.env.CI;

/** A positive whole number of milliseconds from the environment, or the default. */
function timeoutFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  if (!/^[1-9][0-9]*$/.test(raw)) throw new Error(`${name} must be a whole number of milliseconds, got "${raw}"`);
  return Number(raw);
}

// Generous on purpose: CI runners and busy laptops are slow, and a write
// waits for a bundler, a receipt and the subgraph. A failure only takes
// longer to show; nothing passes because of a long timeout. While working
// on one test that is too long to wait for a wrong locator, so both can be
// shortened for a local run (see "Working on a test" in e2e/README.md).
const TEST_TIMEOUT_MS = timeoutFromEnv("E2E_TEST_TIMEOUT_MS", 180_000);
/** Assertions and actions (click, fill). */
const EXPECT_TIMEOUT_MS = timeoutFromEnv("E2E_EXPECT_TIMEOUT_MS", 30_000);

// Specs that were written without having been run. They stay out of every
// run, the smoke run and CI included, until someone has run them and removed
// the tag; E2E_INCLUDE_UNVERIFIED=1 lets them in for that.
const UNVERIFIED = /@unverified/;
const includeUnverified = process.env.E2E_INCLUDE_UNVERIFIED === "1";

const browser = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
};

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(__dirname, "test-results"),
  globalSetup: path.join(__dirname, "global-setup.ts"),
  // A chain, an app server and the fakes are process-wide state (the
  // server's rate limits, the fakes' overlays, chain totals), so each worker
  // has a whole stack of its own and runs one test at a time on it. Files
  // are spread over the workers; the tests of a file stay in order on one.
  // One worker unless E2E_WORKERS says otherwise (see "Several workers" in
  // e2e/README.md).
  fullyParallel: false,
  workers: workersFromEnv(),
  grepInvert: includeUnverified ? undefined : UNVERIFIED,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  reporter: isCI
    ? [["list"], ["html", { open: "never", outputFolder: path.join(__dirname, "playwright-report") }]]
    : [["list"]],
  use: {
    baseURL: URLS.app,
    actionTimeout: EXPECT_TIMEOUT_MS,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "api",
      testMatch: "features/**/*.api.spec.ts",
    },
    {
      name: "hermetic",
      testMatch: "features/**/*.spec.ts",
      testIgnore: ["features/**/*.api.spec.ts", "features/**/*.serial.spec.ts", "features/**/*.timetravel.spec.ts"],
      use: browser,
    },
    {
      name: "hermetic-serial",
      testMatch: "features/**/*.serial.spec.ts",
      dependencies: ["hermetic"],
      use: browser,
    },
    {
      // The chain's clock only goes forward and the chain is never reverted,
      // so nothing may run on a stack after these.
      name: "hermetic-timetravel",
      testMatch: "features/**/*.timetravel.spec.ts",
      dependencies: ["hermetic-serial"],
      // A retry cannot pass: after the clock jump the stack can no longer
      // sponsor writes, the test's own persona seeding included, so a retry
      // would only hide the first failure behind a seeding timeout.
      retries: 0,
      use: browser,
    },
    {
      name: "extension",
      testMatch: "extension/**/*.spec.ts",
      use: browser,
    },
    {
      name: "live",
      testMatch: "live/**/*.spec.ts",
      use: { ...browser, baseURL: STAGING.appUrl },
    },
  ],
});
