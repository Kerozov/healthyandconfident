/**
 * Fixed-window, in-memory rate limiter.
 *
 * Each serverless instance keeps its own buckets, so this is a speed bump for
 * scripted floods from one address, not a hard global limit.
 */
export type RateLimiter = (key: string) => boolean;

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function rateLimited(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      }
      return false;
    }

    bucket.count += 1;
    return bucket.count > limit;
  };
}

export function requestIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
