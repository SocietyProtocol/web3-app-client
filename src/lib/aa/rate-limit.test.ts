import { describe, expect, it } from "vitest";

import { TokenBucketLimiter } from "./rate-limit";

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
