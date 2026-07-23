import { NextRequest } from 'next/server';

interface RateLimitData {
  count: number;
  resetTime: number;
}

// Fallback in-memory store for dev or missing Redis
const rateLimitStore = new Map<string, RateLimitData>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // Allow 20 requests per minute per IP

export async function checkRateLimit(req: NextRequest, uid?: string): Promise<{ success: boolean; headers: HeadersInit }> {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const identifier = uid || ip;
  const now = Date.now();

  // 1. Upstash Redis Implementation (Distributed)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const url = `${process.env.UPSTASH_REDIS_REST_URL}/pipeline`;
      const resetTime = now + WINDOW_MS;
      
      const payload = [
        ["INCR", `ratelimit:${identifier}`],
        ["PEXPIRE", `ratelimit:${identifier}`, WINDOW_MS, "NX"]
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      const count = data[0].result;
      
      return {
        success: count <= MAX_REQUESTS_PER_WINDOW,
        headers: {
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS_PER_WINDOW - count).toString(),
          'X-RateLimit-Reset': resetTime.toString(),
        },
      };
    } catch (e) {
      console.warn('Upstash Redis rate limiter failed, falling back to in-memory', e);
    }
  }

  // 2. Fallback In-Memory Implementation
  const data = rateLimitStore.get(identifier);

  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetTime) rateLimitStore.delete(key);
    }
  }

  if (!data || now > data.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return {
      success: true,
      headers: {
        'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
        'X-RateLimit-Remaining': (MAX_REQUESTS_PER_WINDOW - 1).toString(),
        'X-RateLimit-Reset': (now + WINDOW_MS).toString(),
      },
    };
  }

  if (data.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      headers: {
        'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': data.resetTime.toString(),
      },
    };
  }

  data.count += 1;
  rateLimitStore.set(identifier, data);
  return {
    success: true,
    headers: {
      'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
      'X-RateLimit-Remaining': (MAX_REQUESTS_PER_WINDOW - data.count).toString(),
      'X-RateLimit-Reset': data.resetTime.toString(),
    },
  };
}
