/**
 * Build-time switch for the hermetic browser test suite (e2e/): one shorter
 * interval for the app's fixed polling and retry waits, so that a test of a
 * write does not sit out timers that are sized for a real network (a block
 * every 12 seconds) on a local chain that mines at once.
 *
 * It is the client-side counterpart of lib/e2e-overrides. The waits run in
 * the browser, so the value has to be compiled into the bundle:
 * NEXT_PUBLIC_E2E_POLL_MS, set only by the suite's own build
 * (e2e/support/stack/config.mjs).
 *
 * The value is ignored unless ALL hold:
 *   - the bundle is the suite's own build (lib/e2e-build, the same
 *     build-time lock as lib/e2e-overrides),
 *   - it is a whole number of milliseconds between 50 and 1000.
 * Without it every caller keeps its own interval, exactly as before this
 * file existed. It can only shorten a wait, never lengthen one.
 * Do not read NEXT_PUBLIC_E2E_POLL_MS anywhere else.
 */
import { isE2eBuild } from "@/lib/e2e-build";

const MIN_POLL_MS = 50;
const MAX_POLL_MS = 1_000;

/** The interval of the e2e build, or undefined when it is unset or not honoured. */
export function e2ePollMs(): number | undefined {
  if (!isE2eBuild()) return undefined;
  // Next replaces this literal with the value the bundle was built with.
  const raw = process.env.NEXT_PUBLIC_E2E_POLL_MS;
  if (!raw || !/^[1-9][0-9]*$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= MIN_POLL_MS && value <= MAX_POLL_MS ? value : undefined;
}

/**
 * `standard` in every real deployment. In the e2e build: the e2e interval,
 * but not below `floor` (for a poll that is rate limited) and never above
 * `standard`.
 */
export function pollMs(standard: number, options?: { floor?: number }): number {
  const override = e2ePollMs();
  if (override === undefined) return standard;
  return Math.min(standard, Math.max(override, options?.floor ?? 0));
}

/**
 * For a viem or wagmi client config: nothing in a real deployment, so the
 * library's own default (4 seconds) applies; the e2e interval in the e2e
 * build. Spread it into the config.
 */
export function e2ePollingOption(): { pollingInterval?: number } {
  const override = e2ePollMs();
  return override === undefined ? {} : { pollingInterval: override };
}
