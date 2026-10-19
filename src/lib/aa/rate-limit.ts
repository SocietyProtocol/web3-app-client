/**
 * In-memory token buckets for the sponsorship proxy.
 * Per instance only: each serverless instance keeps its own counts and a
 * cold start resets them. This blunts casual abuse; the Pimlico policy
 * limits remain the real spending ceiling.
 */
export class TokenBucketLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Takes one token for key. Returns false when the bucket is empty. */
  take(key: string, now = Date.now()) {
    const perMs = this.capacity / this.refillMs;
    const bucket = this.buckets.get(key);
    const tokens = bucket
      ? Math.min(this.capacity, bucket.tokens + (now - bucket.at) * perMs)
      : this.capacity;
    if (tokens < 1) {
      this.buckets.set(key, { tokens, at: now });
      return false;
    }
    if (!bucket && this.buckets.size >= this.maxKeys && !this.makeRoom(now)) {
      return false;
    }
    this.buckets.set(key, { tokens: tokens - 1, at: now });
    return true;
  }

  /**
   * Frees a slot without forgetting a limited key: drops buckets that have
   * fully refilled, then the fullest one left. A bucket under one token is
   * never evicted, so flooding new keys cannot reset an exhausted quota.
   * Returns false (refuse the new key) when every bucket is exhausted.
   */
  private makeRoom(now: number) {
    const perMs = this.capacity / this.refillMs;
    let fullestKey: string | undefined;
    let fullest = 1;
    for (const [key, bucket] of this.buckets) {
      const tokens = bucket.tokens + (now - bucket.at) * perMs;
      if (tokens >= this.capacity) {
        this.buckets.delete(key);
      } else if (tokens >= fullest) {
        fullest = tokens;
        fullestKey = key;
      }
    }
    if (this.buckets.size < this.maxKeys) return true;
    if (fullestKey === undefined) return false;
    this.buckets.delete(fullestKey);
    return true;
  }

  reset() {
    this.buckets.clear();
  }
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** A sponsored send makes two paymaster calls (stub, then data). */
export const PAYMASTER_PER_IP_PER_MINUTE = 10;
export const PAYMASTER_PER_SENDER_PER_MINUTE = 5;
/** Bundler calls (estimate, send) per IP. Receipt polling is not limited. */
export const BUNDLER_PER_IP_PER_MINUTE = 30;
/** Sponsored updateProfileURI signatures per sender per day. */
export const PROFILE_UPDATES_PER_SENDER_PER_DAY = 10;

export const aaRateLimits = {
  paymasterByIp: new TokenBucketLimiter(PAYMASTER_PER_IP_PER_MINUTE, MINUTE_MS),
  paymasterBySender: new TokenBucketLimiter(PAYMASTER_PER_SENDER_PER_MINUTE, MINUTE_MS),
  bundlerByIp: new TokenBucketLimiter(BUNDLER_PER_IP_PER_MINUTE, MINUTE_MS),
  profileUpdatesBySender: new TokenBucketLimiter(
    PROFILE_UPDATES_PER_SENDER_PER_DAY,
    DAY_MS,
  ),
};

export function resetAaRateLimits() {
  Object.values(aaRateLimits).forEach((limiter) => limiter.reset());
}

/**
 * First x-forwarded-for hop, as set by the hosting proxy. Anyone can send
 * this header when the app is reached directly, so treat it as best effort.
 */
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
