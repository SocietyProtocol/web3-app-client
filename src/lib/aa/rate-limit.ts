/**
 * In-memory token buckets for the sponsorship proxy.
 * Per instance only: each serverless instance or server process keeps its
 * own counts, and a cold start, restart or deploy resets them. This blunts
 * casual abuse; the Pimlico policy limits remain the real spending ceiling.
 */
export class TokenBucketLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  private tokens(key: string, now: number) {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.capacity;
    const perMs = this.capacity / this.refillMs;
    return Math.min(this.capacity, bucket.tokens + (now - bucket.at) * perMs);
  }

  /** Whether take(key) would find a token, without spending it. */
  has(key: string, now = Date.now()) {
    return this.tokens(key, now) >= 1;
  }

  /** Gives back one token taken from key, up to the capacity. */
  give(key: string, now = Date.now()) {
    if (!this.buckets.has(key)) return;
    this.buckets.set(key, {
      tokens: Math.min(this.capacity, this.tokens(key, now) + 1),
      at: now,
    });
  }

  /** Takes one token for key. Returns false when the bucket is empty. */
  take(key: string, now = Date.now()) {
    const bucket = this.buckets.get(key);
    const tokens = this.tokens(key, now);
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
};

/** Sponsored createProfile calls per visitor IP per day, by default. */
export const PROFILE_CREATES_PER_IP_PER_DAY = 1;
/** Minimum spacing of sponsored createProfile calls across the whole app, by default. */
export const PROFILE_CREATE_APP_INTERVAL_SECONDS = 300;

function limitFromEnv(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Limits on sponsored account creation (createProfile), from the environment:
 *   SPONSORED_PROFILES_PER_IP_PER_DAY (default 1; 0 turns the limit off)
 *   SPONSORED_PROFILE_INTERVAL_SECONDS (default 300, one create per 5 minutes
 *     app-wide; 0 turns the limit off)
 * A value that is not a whole number >= 0 keeps the default.
 * Like every limiter here, the counts live in this process's memory: a
 * restart or deploy forgets them, and each running instance counts on its own.
 */
export function profileCreateLimitsFromEnv(env: Record<string, string | undefined> = process.env) {
  return {
    perIpPerDay: limitFromEnv(
      env.SPONSORED_PROFILES_PER_IP_PER_DAY,
      PROFILE_CREATES_PER_IP_PER_DAY,
    ),
    appIntervalSeconds: limitFromEnv(
      env.SPONSORED_PROFILE_INTERVAL_SECONDS,
      PROFILE_CREATE_APP_INTERVAL_SECONDS,
    ),
  };
}

/** The app-wide bucket has a single key. */
const APP_KEY = "app";

/**
 * One daily bucket holds a visitor for a whole day after a create, and a full
 * map refuses new visitors, so it tracks more of them than the minute limits.
 */
const PROFILE_CREATE_IP_KEYS = 100_000;

function buildProfileCreateLimiters() {
  const limits = profileCreateLimitsFromEnv();
  return {
    byIp:
      limits.perIpPerDay > 0
        ? new TokenBucketLimiter(limits.perIpPerDay, DAY_MS, PROFILE_CREATE_IP_KEYS)
        : undefined,
    app:
      limits.appIntervalSeconds > 0
        ? new TokenBucketLimiter(1, limits.appIntervalSeconds * 1_000)
        : undefined,
  };
}

let profileCreateLimiters: ReturnType<typeof buildProfileCreateLimiters> | undefined;

/**
 * The per-visitor key for createProfile. An IPv6 visitor is keyed on its /64,
 * the block one subscriber usually gets, so rotating addresses inside it does
 * not buy more free accounts. Returns undefined for "unknown" (no client IP
 * header reached the app): those visitors would all share one key, so only the
 * app-wide limit applies to them.
 */
export function profileCreateIpKey(ip: string) {
  if (ip === "unknown") return undefined;
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const groups = head ? head.split(":") : [];
  // With "::", the groups before it are followed by zeros.
  if (ip.includes("::")) {
    const tailGroups = tail ? tail.split(":") : [];
    while (groups.length + tailGroups.length < 8) groups.push("0");
    groups.push(...tailGroups);
  }
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/**
 * Spends one sponsored createProfile for this visitor IP and one app-wide.
 * Both are checked before either is spent, so a refusal by one limit does
 * not use up the other. On success, release() gives both back; the proxy
 * calls it when Pimlico returns no paymaster signature.
 *
 * The allowance is spent when the paymaster signs, not when the UserOp is
 * sent: that signature can be submitted to any bundler, so it is the thing
 * being limited. A user who then cancels the wallet prompt has still used
 * the allowance, and anyone can hold the app-wide slot by asking for
 * signatures they never submit (see DEPLOYMENT.md, "Sponsorship limits").
 */
export function takeProfileCreate(
  ip: string,
  now = Date.now(),
): { ok: true; release: (now?: number) => void } | { ok: false; message: string } {
  profileCreateLimiters ??= buildProfileCreateLimiters();
  const { byIp, app } = profileCreateLimiters;
  const ipKey = profileCreateIpKey(ip);
  const perIp = byIp && ipKey !== undefined ? { limiter: byIp, key: ipKey } : undefined;
  const daily = { ok: false as const, message: "Daily sponsored profile limit reached" };
  if (perIp && !perIp.limiter.has(perIp.key, now)) return daily;
  if (app && !app.has(APP_KEY, now)) {
    console.warn("Sponsored profile refused by the app-wide limit");
    return { ok: false, message: "Sponsored profile limit reached, try again in a few minutes" };
  }
  if (perIp && !perIp.limiter.take(perIp.key, now)) return daily;
  app?.take(APP_KEY, now);
  return {
    ok: true,
    release: (at = Date.now()) => {
      perIp?.limiter.give(perIp.key, at);
      app?.give(APP_KEY, at);
    },
  };
}

/** Clears every count. The createProfile limits re-read the environment. */
export function resetAaRateLimits() {
  Object.values(aaRateLimits).forEach((limiter) => limiter.reset());
  profileCreateLimiters = undefined;
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
