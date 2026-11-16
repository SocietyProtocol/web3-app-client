import { describe, expect, it } from "vitest";

import {
  PROFILE_CREATE_APP_INTERVAL_SECONDS,
  PROFILE_CREATES_PER_IP_PER_DAY,
  TokenBucketLimiter,
  clientIp,
  profileCreateLimitsFromEnv,
  resetAaRateLimits,
  takeProfileCreate,
} from "./rate-limit";

describe("clientIp", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("uses the visitor IP Cloudflare reports, not the edge in x-forwarded-for", () => {
    expect(
      clientIp(headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "172.68.0.1" })),
    ).toBe("203.0.113.7");
  });

  it("ignores a client-supplied first x-forwarded-for hop", () => {
    expect(clientIp(headers({ "x-forwarded-for": "198.51.100.1, 172.68.0.1" }))).toBe(
      "172.68.0.1",
    );
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(headers({}))).toBe("unknown");
  });
});

describe("TokenBucketLimiter", () => {
  it("limits a key until it refills", () => {
    const limiter = new TokenBucketLimiter(2, 1_000);
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 0)).toBe(false);
    expect(limiter.take("a", 500)).toBe(true);
  });

  it("keeps an exhausted key limited when new keys fill the map", () => {
    const limiter = new TokenBucketLimiter(2, 1_000, 3);
    limiter.take("victim", 0);
    limiter.take("victim", 0);
    for (let i = 0; i < 10; i++) {
      expect(limiter.take(`flood-${i}`, 1)).toBe(true);
    }
    expect(limiter.take("victim", 2)).toBe(false);
  });

  it("evicts fully refilled buckets before partly used ones", () => {
    const limiter = new TokenBucketLimiter(2, 1_000, 2);
    limiter.take("old", 0);
    limiter.take("busy", 900);
    limiter.take("busy", 900);
    expect(limiter.take("new", 1_000)).toBe(true);
    expect(limiter.take("busy", 1_000)).toBe(false);
  });

  it("refuses new keys when every tracked bucket is exhausted", () => {
    const limiter = new TokenBucketLimiter(1, 1_000, 2);
    limiter.take("a", 0);
    limiter.take("b", 0);
    expect(limiter.take("c", 0)).toBe(false);
    expect(limiter.take("a", 0)).toBe(false);
    expect(limiter.take("c", 1_000)).toBe(true);
  });
});

describe("TokenBucketLimiter.has", () => {
  it("reports a token without spending it", () => {
    const limiter = new TokenBucketLimiter(1, 1_000);
    expect(limiter.has("a", 0)).toBe(true);
    expect(limiter.has("a", 0)).toBe(true);
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.has("a", 0)).toBe(false);
    expect(limiter.has("a", 1_000)).toBe(true);
  });
});

describe("profileCreateLimitsFromEnv", () => {
  it("defaults to one per IP per day and one per 5 minutes app-wide", () => {
    expect(PROFILE_CREATES_PER_IP_PER_DAY).toBe(1);
    expect(PROFILE_CREATE_APP_INTERVAL_SECONDS).toBe(300);
    expect(profileCreateLimitsFromEnv({})).toEqual({ perIpPerDay: 1, appIntervalSeconds: 300 });
  });

  it("reads whole numbers, 0 included, and ignores anything else", () => {
    expect(
      profileCreateLimitsFromEnv({
        SPONSORED_PROFILES_PER_IP_PER_DAY: "3",
        SPONSORED_PROFILE_INTERVAL_SECONDS: "0",
      }),
    ).toEqual({ perIpPerDay: 3, appIntervalSeconds: 0 });
    for (const bad of ["", " ", "-1", "1.5", "ten"]) {
      expect(
        profileCreateLimitsFromEnv({
          SPONSORED_PROFILES_PER_IP_PER_DAY: bad,
          SPONSORED_PROFILE_INTERVAL_SECONDS: bad,
        }),
      ).toEqual({ perIpPerDay: 1, appIntervalSeconds: 300 });
    }
  });
});

describe("takeProfileCreate", () => {
  const DAY = 24 * 60 * 60_000;

  it("allows one per IP per day and one per 5 minutes app-wide by default", () => {
    resetAaRateLimits();
    expect(takeProfileCreate("ip-a", 0)).toEqual({ ok: true });
    expect(takeProfileCreate("ip-b", 60_000)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/few minutes/),
    });
    expect(takeProfileCreate("ip-b", 300_000)).toEqual({ ok: true });
    expect(takeProfileCreate("ip-a", 600_000)).toMatchObject({
      ok: false,
      message: "Daily sponsored profile limit reached",
    });
    expect(takeProfileCreate("ip-a", DAY)).toEqual({ ok: true });
  });

  it("does not spend the app-wide slot on a visitor over its daily limit", () => {
    resetAaRateLimits();
    expect(takeProfileCreate("ip-a", 0).ok).toBe(true);
    expect(takeProfileCreate("ip-b", 300_000).ok).toBe(true);
    // ip-a is refused for the day, which must leave the app-wide slot free.
    expect(takeProfileCreate("ip-a", 600_000).ok).toBe(false);
    expect(takeProfileCreate("ip-c", 600_000).ok).toBe(true);
  });
});
