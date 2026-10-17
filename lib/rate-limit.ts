// Lightweight per-IP in-memory rate limiter for Next.js API routes.
// For production with multiple instances, replace with Redis/Upstash.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  identifier: string,
  opts: RateLimitOptions = { windowMs: 60_000, maxRequests: 60 },
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const refillRate = opts.maxRequests / opts.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: opts.maxRequests, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(opts.maxRequests, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  const success = bucket.tokens >= 1;
  if (success) bucket.tokens -= 1;

  // Simple cleanup: remove buckets idle for more than 2 windows.
  if (bucket.tokens === opts.maxRequests && elapsed > opts.windowMs * 2) {
    buckets.delete(key);
  }

  return {
    success,
    remaining: Math.floor(bucket.tokens),
    resetAt: now + Math.ceil((1 - bucket.tokens) / refillRate),
  };
}

export function getClientIp(req: { headers: Headers; ip?: string | null }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip ?? "anonymous";
}
