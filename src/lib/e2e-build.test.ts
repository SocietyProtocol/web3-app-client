import { afterEach, describe, expect, it, vi } from "vitest";
import { getStaticEnv } from "next/dist/lib/static-env";
import type { NextConfig } from "next";

/** next.config.ts as `next build` would load it with this build environment. */
async function loadConfig(marker: string | undefined): Promise<NextConfig> {
  vi.resetModules();
  // Stubbed first so that unstubAllEnvs puts the original value back.
  vi.stubEnv("NEXT_PUBLIC_E2E_BUILD", marker ?? "");
  if (marker === undefined) delete process.env.NEXT_PUBLIC_E2E_BUILD;
  return (await import("../../next.config")).default;
}

/** What `next build` replaces `process.env.NEXT_PUBLIC_E2E_BUILD` with, in server and client bundles. */
async function inlinedMarker(marker: string | undefined): Promise<unknown> {
  const config = await loadConfig(marker);
  const env = getStaticEnv({ ...config, configFileName: "next.config.ts" } as Parameters<typeof getStaticEnv>[0]);
  const key = "process.env.NEXT_PUBLIC_E2E_BUILD";
  return Object.prototype.hasOwnProperty.call(env, key) ? env[key as keyof typeof env] : "NOT INLINED";
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the e2e build marker is fixed at build time", () => {
  // Without this, a build that never had the marker kept a live
  // process.env.NEXT_PUBLIC_E2E_BUILD read in its server bundle, and a
  // deployed server could have been switched on by its runtime environment.
  it("is inlined as empty when the build did not set it", async () => {
    expect(await inlinedMarker(undefined)).toBe("");
  });

  it("is inlined as empty when the build set anything but exactly 1", async () => {
    expect(await inlinedMarker("true")).toBe("");
    expect(await inlinedMarker("")).toBe("");
  });

  it("is inlined as 1 for the suite's own build", async () => {
    expect(await inlinedMarker("1")).toBe("1");
  });
});
