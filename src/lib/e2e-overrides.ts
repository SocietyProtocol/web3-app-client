/**
 * Server-only switches for the hermetic browser test suite (e2e/). They point
 * the API routes at a local chain, a local bundler and paymaster, and a fake
 * S3 endpoint instead of the real services.
 *
 * Every override is ignored unless ALL hold:
 *   - E2E_HERMETIC is exactly "1" (read at runtime, never NEXT_PUBLIC_),
 *   - the bundle is the suite's own build (lib/e2e-build: built as
 *     "development" AND with the suite's build marker), and
 *   - the running server's environment says the same.
 * So a deployment, staging included, ignores them whatever its runtime
 * environment holds, unless its image was built with the marker.
 * With the flag off, callers behave exactly as they did before these existed.
 * Do not read the E2E_* variables anywhere else: go through e2eOverride().
 */
import { isE2eBuild, isE2eRuntime } from "@/lib/e2e-build";

export type E2eOverrideName =
  /** JSON-RPC endpoint for server-side chain reads (sender check, auth). */
  | "E2E_RPC_URL"
  /** Bundler and paymaster endpoint the /api/aa/rpc proxy forwards to. */
  | "E2E_PIMLICO_UPSTREAM_URL"
  /** S3-compatible endpoint used in place of Filebase. */
  | "E2E_FILEBASE_ENDPOINT";

export function e2eHermeticEnabled(): boolean {
  return process.env.E2E_HERMETIC === "1" && isE2eBuild() && isE2eRuntime();
}

/** The override's value, or undefined when it is unset or not honoured. */
export function e2eOverride(name: E2eOverrideName): string | undefined {
  if (!e2eHermeticEnabled()) return undefined;
  return process.env[name] || undefined;
}
