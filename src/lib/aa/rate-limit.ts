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

/**
 * At most `cap` distinct keys admitted in any rolling window of windowMs.
 * A key admitted inside the window is admitted again without counting
 * twice. Memory stays at most `cap` keys. Per instance, like the buckets.
 */
export class RollingWindowCap {
  private readonly admitted = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  private prune(now: number) {
    for (const [key, at] of this.admitted) {
      if (now - at >= this.windowMs) this.admitted.delete(key);
    }
  }

  /** Whether take(key) would succeed now, without taking anything. */
  wouldAdmit(key: string, cap: number, now = Date.now()) {
    this.prune(now);
    return this.admitted.has(key) || this.admitted.size < cap;
  }

  /** Admits key (counting it once per window). False once the cap is reached. */
  take(key: string, cap: number, now = Date.now()) {
    if (!this.wouldAdmit(key, cap, now)) return false;
    if (!this.admitted.has(key)) this.admitted.set(key, now);
    return true;
  }

  reset() {
    this.admitted.clear();
  }
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * The "per sender" limits below count one sender as seen from one visitor IP
 * (see admitAaRpc): requests from another IP naming the same sender do not
 * spend its allowance.
 */
/** A sponsored send makes two paymaster calls (stub, then data). */
export const PAYMASTER_PER_IP_PER_MINUTE = 10;
export const PAYMASTER_PER_SENDER_PER_MINUTE = 5;
/** Bundler calls (estimate, send) per IP. Receipt polling is not limited. */
export const BUNDLER_PER_IP_PER_MINUTE = 30;
/** Sponsored updateProfileURI signatures per sender per day. */
export const PROFILE_UPDATES_PER_SENDER_PER_DAY = 10;
/**
 * Sponsored acceptInvite calls per sender per day. The contract accepts an
 * invite signed by any key, so without this one account could have Society
 * pay for an endless stream of invites it signs for itself.
 */
export const INVITE_ACCEPTS_PER_SENDER_PER_DAY = 5;

/**
 * Sponsorship signatures for the free first badge per sender per day. Only
 * one free badge can ever land (lib/aa/first-badge pins the nonce); this
 * covers a retry after a declined wallet prompt without letting one visitor
 * collect a pile of signed sponsorships.
 */
export const FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY = 3;
/**
 * Server variable: free badges the whole app gives out per day (rolling 24
 * hours, per server instance). One sender counts once however many times it
 * asks, and only once it has passed every other check.
 */
export const FIRST_BADGE_DAILY_CAP_ENV = "FIRST_BADGE_DAILY_CAP";
/**
 * Twenty a day: well above the number of new members who make their first
 * badge on a normal day, and small enough that a farm of aged profiles can
 * take at most twenty sponsored badges a day before everyone pays their own
 * gas again. The separate Pimlico policy's cap (DEPLOYMENT.md) is the hard
 * ceiling across instances and restarts.
 */
export const DEFAULT_FIRST_BADGE_DAILY_CAP = 20;

/** The cap from the environment. Unset, empty or not a whole number at least 0: the default. 0 gives none away. */
export function firstBadgeDailyCap(): number {
  const raw = process.env[FIRST_BADGE_DAILY_CAP_ENV]?.trim();
  const cap = raw ? Number(raw) : NaN;
  return Number.isInteger(cap) && cap >= 0 ? cap : DEFAULT_FIRST_BADGE_DAILY_CAP;
}

/** GET /api/aa/first-badge per IP: each answer costs subgraph and node reads. */
export const FIRST_BADGE_CHECKS_PER_IP_PER_MINUTE = 20;

export const aaRateLimits = {
  paymasterByIp: new TokenBucketLimiter(PAYMASTER_PER_IP_PER_MINUTE, MINUTE_MS),
  paymasterBySender: new TokenBucketLimiter(PAYMASTER_PER_SENDER_PER_MINUTE, MINUTE_MS),
  bundlerByIp: new TokenBucketLimiter(BUNDLER_PER_IP_PER_MINUTE, MINUTE_MS),
  profileUpdatesBySender: new TokenBucketLimiter(
    PROFILE_UPDATES_PER_SENDER_PER_DAY,
    DAY_MS,
  ),
  inviteAcceptsBySender: new TokenBucketLimiter(
    INVITE_ACCEPTS_PER_SENDER_PER_DAY,
    DAY_MS,
  ),
  firstBadgeSignaturesBySender: new TokenBucketLimiter(
    FIRST_BADGE_SIGNATURES_PER_SENDER_PER_DAY,
    DAY_MS,
  ),
  firstBadgeChecksByIp: new TokenBucketLimiter(
    FIRST_BADGE_CHECKS_PER_IP_PER_MINUTE,
    MINUTE_MS,
  ),
  /** Keyed on chainId:sender, capped at firstBadgeDailyCap(). */
  firstBadgesPerDay: new RollingWindowCap(DAY_MS),
};

export function resetAaRateLimits() {
  Object.values(aaRateLimits).forEach((limiter) => limiter.reset());
}

/**
 * The visitor's IP as Cloudflare reports it. Behind Cloudflare and Caddy the
 * first x-forwarded-for hop is the Cloudflare edge, so it would put every
 * visitor on that edge in one bucket. The last hop is the one our own proxy
 * appended; the first is whatever the client sent.
 */
export function clientIp(headers: Headers) {
  const cloudflare = headers.get("cf-connecting-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return cloudflare || headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}
