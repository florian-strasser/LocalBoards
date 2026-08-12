import { getRequestIP } from "h3";

// Simple in-memory fixed-window rate limiter.
//
// Scope note: state lives in the Node process, so limits are per-instance and
// reset on restart. That's the right fit for the documented single-container
// LokalBoards deployment. If the app is ever scaled to multiple replicas behind
// a load balancer, this would need a shared store (DB/Redis) — the `check`
// interface is kept small so the store can be swapped without touching callers.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  // Milliseconds until the window resets (0 when allowed).
  retryAfterMs: number;
}

export interface RateLimiter {
  // Count this event against the budget and report whether it is allowed.
  // Use for endpoints where every request should count (e.g. each request does
  // real work like sending an email).
  consume: (key: string, now?: number) => RateLimitResult;
  // Report whether the key is currently under its budget WITHOUT counting.
  // Use to block before doing work, then `consume` only on failure (e.g. login,
  // so successful logins don't burn the budget).
  peek: (key: string, now?: number) => RateLimitResult;
}

export function createRateLimiter(options: {
  max: number;
  windowMs: number;
}): RateLimiter {
  const { max, windowMs } = options;
  const hits = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = 0;

  function getEntry(key: string, now: number) {
    // Periodically drop expired entries so memory stays bounded to roughly the
    // number of distinct keys seen within a window.
    if (now - lastSweep > windowMs) {
      for (const [k, v] of hits) {
        if (now >= v.resetAt) hits.delete(k);
      }
      lastSweep = now;
    }

    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    return entry;
  }

  function result(
    count: number,
    resetAt: number,
    now: number,
  ): RateLimitResult {
    const allowed = count <= max;
    return {
      allowed,
      remaining: Math.max(0, max - count),
      retryAfterMs: allowed ? 0 : resetAt - now,
    };
  }

  function consume(key: string, now: number = Date.now()): RateLimitResult {
    const entry = getEntry(key, now);
    entry.count++;
    return result(entry.count, entry.resetAt, now);
  }

  function peek(key: string, now: number = Date.now()): RateLimitResult {
    const entry = getEntry(key, now);
    // +1 reflects whether the *next* event would be allowed.
    return result(entry.count + 1, entry.resetAt, now);
  }

  return { consume, peek };
}

// Best-effort client IP, honouring X-Forwarded-For when present (LokalBoards is
// typically run behind a reverse proxy). Falls back to a constant so the limiter
// still functions if no IP can be determined.
export function clientIp(event: any): string {
  return getRequestIP(event, { xForwardedFor: true }) || "unknown";
}

function set429(event: any, result: RateLimitResult) {
  event.res.statusCode = 429;
  event.res.setHeader(
    "Retry-After",
    String(Math.ceil(result.retryAfterMs / 1000)),
  );
}

/**
 * Count this request against the limiter (keyed by client IP). On limit, sets
 * 429 + `Retry-After` and returns false; the caller returns its own error body.
 * Returns true when the request may proceed. Use where every request counts.
 */
export function enforceRateLimit(event: any, limiter: RateLimiter): boolean {
  const result = limiter.consume(clientIp(event));
  if (!result.allowed) {
    set429(event, result);
    return false;
  }
  return true;
}

/**
 * Block (429) if the client IP is already at its limit, WITHOUT counting this
 * request. Returns true when blocked. Pair with `recordFailure` so only failed
 * attempts count (e.g. login).
 */
export function blockIfRateLimited(event: any, limiter: RateLimiter): boolean {
  const result = limiter.peek(clientIp(event));
  if (!result.allowed) {
    set429(event, result);
    return true;
  }
  return false;
}

/** Count one failed attempt for the client IP against the limiter. */
export function recordFailure(event: any, limiter: RateLimiter): void {
  limiter.consume(clientIp(event));
}

// Per-endpoint limiters (module singletons, shared across requests in this
// instance). Tuned for online brute-force / abuse protection without tripping
// legitimate users.
export const signInLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
});
export const passwordRequestLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
});
export const passwordResetLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
});
