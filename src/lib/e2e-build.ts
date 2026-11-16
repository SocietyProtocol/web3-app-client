/**
 * The one lock on every switch of the hermetic browser test suite (e2e/):
 * lib/e2e-overrides, lib/e2e-timing and lib/e2e-legacy-accounts all ask here
 * first, and honour nothing unless this is the suite's own build.
 *
 * It is an allowlist. BOTH must hold, and both are compiled into the bundle
 * by `next build` (the marker through `env` in next.config.ts, so that it is
 * inlined even when a build does not set it):
 *   - NEXT_PUBLIC_ENVIRONMENT is exactly "development", and
 *   - NEXT_PUBLIC_E2E_BUILD is exactly "1".
 * Only the suite's launcher sets the marker (APP_BUILD_ENV in
 * e2e/support/stack/config.mjs). No deployment sets it: not production, and
 * not staging either, which is also built as "development". So one stray
 * E2E variable in a deployment's env files changes nothing.
 * Do not read NEXT_PUBLIC_E2E_BUILD anywhere else.
 */
export function isE2eBuild(): boolean {
  // Next replaces both literals with the values the bundle was built with.
  return (
    process.env.NEXT_PUBLIC_ENVIRONMENT === "development" &&
    process.env.NEXT_PUBLIC_E2E_BUILD === "1"
  );
}

/**
 * Server only: the same two values as the running server's environment has
 * them. Read through an alias so that they are NOT replaced at build time.
 */
export function isE2eRuntime(): boolean {
  const runtime: Record<string, string | undefined> = process.env;
  return (
    runtime.NEXT_PUBLIC_ENVIRONMENT === "development" &&
    runtime.NEXT_PUBLIC_E2E_BUILD === "1"
  );
}
