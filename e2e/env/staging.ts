/**
 * Public addresses of the deployed staging environment, for the `live`
 * layer. No keys here: funded test keys come from a gitignored
 * .env.e2e.local or from CI secrets (see e2e/live/README.md).
 */
export const STAGING = {
  /**
   * Where the `live` project runs: E2E_LIVE_BASE_URL. There is no default,
   * so that a live run never points at a real environment by accident, and
   * no deployment's address is kept in this repository.
   */
  appUrl: process.env.E2E_LIVE_BASE_URL || undefined,
  chainId: 11155111,
} as const;

/** For the live fixtures: the base URL, or a clear error when it is not set. */
export function requireLiveBaseUrl(): string {
  if (!STAGING.appUrl) {
    throw new Error("The live tests need E2E_LIVE_BASE_URL: the address of the deployed app to run against.");
  }
  return STAGING.appUrl;
}
