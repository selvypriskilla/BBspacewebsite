type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function checkRateLimitKV(
  kv: KVNamespace,
  identifier: string,
  windowMs = 60_000,
  maxRequests = 10,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = Math.ceil(now / windowMs) * windowMs;
  const key = `rl:${identifier}`;

  const raw = await kv.get(key);
  const count = raw ? Number(raw) : 0;

  if (count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }

  await kv.put(key, String(count + 1), {
    expirationTtl: Math.ceil(windowMs / 1000),
  });

  return {
    allowed: true,
    remaining: maxRequests - count - 1,
    resetTime,
  };
}
