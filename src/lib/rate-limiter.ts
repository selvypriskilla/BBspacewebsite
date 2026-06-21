import { createMiddleware } from "@tanstack/react-start";

type GlobalWithKV = typeof globalThis & {
  KV?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
};
import { checkRateLimitKV } from "./rate-limiter-kv";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Simple in-memory fallback for local development.
const rateLimits = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

async function checkRateLimitInMemory(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = rateLimits.get(identifier);

  if (!existing || now > existing.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetTime: now + WINDOW_MS };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }

  existing.count++;
  return { allowed: true, remaining: MAX_REQUESTS - existing.count, resetTime: existing.resetTime };
}

async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const useKv = process.env.RATE_LIMIT_KV_ENABLED === "true";
  const kvBinding =
    typeof globalThis !== "undefined" && "KV" in globalThis
      ? (globalThis as GlobalWithKV).KV
      : undefined;

  if (useKv && kvBinding) {
    try {
      return await checkRateLimitKV(kvBinding, identifier, WINDOW_MS, MAX_REQUESTS);
    } catch (error) {
      console.warn("KV rate limiter failed, falling back to in-memory limiter", error);
    }
  }

  return checkRateLimitInMemory(identifier);
}

// Middleware for rate limiting
export function rateLimitMiddleware(identifierFn?: (context: { userId?: string }) => string) {
  return createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    const ctx = (context ?? {}) as { userId?: string };
    const identifier = identifierFn ? identifierFn(ctx) : ctx.userId || "anonymous";
    const { allowed, remaining, resetTime } = await checkRateLimit(identifier);

    if (!allowed) {
      const resetIn = Math.ceil((resetTime - Date.now()) / 1000);
      throw new Response(`Rate limit exceeded. Try again in ${resetIn} seconds.`, {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
          "Retry-After": resetIn.toString(),
        },
      });
    }

    const response = await next({
      context: {
        ...ctx,
        rateLimit: { remaining, resetTime },
      },
    });

    if (response instanceof Response) {
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", resetTime.toString());
    }

    return response;
  });
}
