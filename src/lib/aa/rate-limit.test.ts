import { describe, expect, it } from "vitest";

import { TokenBucketLimiter, clientIp } from "./rate-limit";

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
