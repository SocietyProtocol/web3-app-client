import { afterEach, describe, expect, it, vi } from "vitest";
import { e2eLegacyAccounts } from "@/lib/e2e-legacy-accounts";
import {
  legacyAccountsFor,
  legacySocietyAddress,
} from "@/components/shared/legacyAccounts";

const WALLET = "0x1111111111111111111111111111111111111111";
const SOCIETY = "0x2222222222222222222222222222222222222222";
const VALUE = JSON.stringify({ [WALLET]: SOCIETY });

/** `marker` is NEXT_PUBLIC_E2E_BUILD, the mark of the suite's own build. */
type Mode = { value?: string; environment?: string; marker?: string };

function stub({ value, environment, marker }: Mode) {
  vi.stubEnv("NEXT_PUBLIC_E2E_LEGACY_ACCOUNTS", value ?? "");
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment ?? "");
  vi.stubEnv("NEXT_PUBLIC_E2E_BUILD", marker ?? "");
}

/** The suite's own build with this value. */
function e2eBuild(value: string): Mode {
  return { value, environment: "development", marker: "1" };
}

/** Every way the value can be absent, malformed or locked out. */
const IGNORED: Array<[string, Mode]> = [
  ["it is unset", { environment: "development", marker: "1" }],
  ["it is unset and the environment is unset", {}],
  ["it is unset in production", { environment: "production" }],
  ["the environment is production", { value: VALUE, environment: "production", marker: "1" }],
  ["the environment is staging", { value: VALUE, environment: "staging", marker: "1" }],
  ["the environment is unset", { value: VALUE, marker: "1" }],
  // A deployed staging bundle that got the value by mistake: staging is
  // built as "development", but never with the build marker.
  ["the build marker is absent", { value: VALUE, environment: "development" }],
  ["the build marker is not exactly 1", { value: VALUE, environment: "development", marker: "yes" }],
  ["it is not JSON", e2eBuild("{ nope")],
  ["it is a list", e2eBuild("[]")],
  ["it is a string", e2eBuild('"x"')],
  ["a value is not a string", e2eBuild(`{"${WALLET}": 1}`)],
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("e2eLegacyAccounts", () => {
  it.each(IGNORED)("is ignored when %s", (_name, mode) => {
    stub(mode);
    const committed = legacyAccountsFor(11155111);
    expect(e2eLegacyAccounts()).toBeUndefined();
    expect(legacySocietyAddress(WALLET, 11155111)).toBeUndefined();
    // The map is exactly the committed one.
    vi.unstubAllEnvs();
    expect(committed).toEqual(legacyAccountsFor(11155111));
  });

  it("adds its entries to the committed map in the suite's build", () => {
    stub({ environment: "development", marker: "1" });
    const committed = legacyAccountsFor(11155111);
    stub(e2eBuild(VALUE));
    expect(legacySocietyAddress(WALLET, 11155111)).toBe(SOCIETY);
    expect(legacyAccountsFor(11155111)).toEqual({
      ...committed,
      [WALLET]: SOCIETY,
    });
  });

  it("leaves a map passed in by the caller alone", () => {
    stub(e2eBuild(VALUE));
    expect(legacyAccountsFor(11155111, {})).toEqual({});
  });
});
