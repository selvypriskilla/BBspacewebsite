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
  // Best-effort incremental counter with verification loop.
  // NOTE: Workers KV does not provide atomic increment primitives. This
  // implementation reduces TOCTOU risk by performing a read-then-write
  // with a small verification retry. For strict atomicity use Durable
  // Objects instead (recommended for production).

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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

    const newVal = String(count + 1);
    try {
      await kv.put(key, newVal, {
        expirationTtl: Math.ceil(windowMs / 1000),
      });

      // Verify write succeeded and the value matches expectation.
      const verify = await kv.get(key);
      if (verify === newVal) {
        return {
          allowed: true,
          remaining: maxRequests - count - 1,
          resetTime,
        };
      }
      // If verification failed, small jitter before retrying.
      await new Promise((res) => setTimeout(res, 20 + Math.random() * 30));
    } catch (err) {
      // transient error — retry
      await new Promise((res) => setTimeout(res, 20 + Math.random() * 30));
    }
  }

  // If we exhausted retries, fall back to pessimistic deny to avoid
  // allowing bursts that could drive up cost.
  return {
    allowed: false,
    remaining: 0,
    resetTime,
    retryAfter: Math.ceil((resetTime - now) / 1000),
  };
}
