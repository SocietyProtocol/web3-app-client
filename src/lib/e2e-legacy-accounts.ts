/**
 * Build-time switch for the hermetic browser test suite (e2e/): extra
 * entries for the legacy account map (old wallet => Society address), so
 * that a test can be a member from before smart accounts without its test
 * wallet being added to the committed map (consts/legacy-account-map.json).
 *
 * Like lib/e2e-timing it is read in the browser, so the value has to be
 * compiled into the bundle: NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS, a JSON object
 * { "<wallet>": "<Society address>" }, set only by the suite's own build
 * (e2e/support/stack/config.mjs).
 *
 * The value is ignored unless ALL hold:
 *   - the bundle is the suite's own build (lib/e2e-build, the same
 *     build-time lock as lib/e2e-overrides and lib/e2e-timing),
 *   - it is a JSON object whose values are all strings.
 * Without it the map is exactly the committed one. It is unset in every
 * deployment. Do not read NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS anywhere else.
 */
import { isE2eBuild } from "@/lib/e2e-build";

export function e2eLegacyAccounts(): Record<string, string> | undefined {
  if (!isE2eBuild()) return undefined;
  // Next replaces this literal with the value the bundle was built with.
  const raw = process.env.NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS;
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const entries = Object.entries(parsed);
    if (!entries.every(([, value]) => typeof value === "string")) {
      return undefined;
    }
    return Object.fromEntries(entries) as Record<string, string>;
  } catch {
    return undefined;
  }
}
