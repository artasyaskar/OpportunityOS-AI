import { NextRequest } from 'next/server';

interface RateLimitData {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (lasts for the lifetime of the serverless function instance)
const rateLimitStore = new Map<string, RateLimitData>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // Allow 20 requests per minute per IP

export function checkRateLimit(req: NextRequest, uid?: string): { success: boolean; headers: HeadersInit } {
  // Extract IP from headers (works on Vercel/Next.js)
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const identifier = uid || ip;
  
  const now = Date.now();
  const data = rateLimitStore.get(identifier);

  // Clean up old entries periodically to prevent memory leaks in long-running instances
  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!data || now > data.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
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
