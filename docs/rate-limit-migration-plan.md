# Rate Limit Migration Plan — Shared Store for Production

## Current State

- **Location:** `lib/rate-limit.js`
- **Storage:** In-memory `Map` (key → timestamps[])
- **Behavior:** Sliding window per key; adequate for single-instance deploys
- **Limitation:** Per-process state — with multiple serverless instances or horizontal scaling, each instance has its own limits. An attacker can exceed limits by hitting different instances.

## When to Migrate

Migrate when:
- Deploying to Netlify, Vercel, or similar (multiple serverless instances)
- Running multiple Node processes (e.g. PM2 cluster)
- Rate limits are critical for abuse prevention (checkout, promo validation, etc.)

## Recommended Approach: Upstash Redis

[Upstash](https://upstash.com/) provides serverless Redis with a free tier and works well with Netlify, Vercel, and other serverless platforms.

### 1. Install

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### 3. Create Shared Rate Limit Module

Create `lib/rate-limit-upstash.js`:

```javascript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Sliding window (matches current behavior)
export const checkoutLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:checkout',
})

export const promoLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:promo',
})

export const availabilityLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rl:availability',
})

export const waitlistConfigLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:waitlist-config',
})
```

### 4. Fallback Strategy

Use Upstash when configured, fall back to in-memory when not:

```javascript
// lib/rate-limit.js
const USE_UPSTASH = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

export async function rateLimitAsync(key, limit, windowMs) {
  if (USE_UPSTASH) {
    const { success, reset } = await upstashLimit.limit(key)
    return {
      allowed: success,
      resetAt: reset,
    }
  }
  return rateLimit(key, limit, windowMs) // existing in-memory
}
```

### 5. Migration Steps

1. Create Upstash Redis database (Upstash console)
2. Add env vars to Netlify (Site settings → Environment variables)
3. Create `lib/rate-limit-upstash.js`
4. Update `lib/rate-limit.js` to export a unified `rateLimit` that:
   - Uses Upstash when env vars present
   - Falls back to in-memory otherwise
5. Convert rate-limited routes to async where needed (Upstash is async)
6. Deploy and verify 429 responses are consistent across instances

### 6. Routes to Update

| Route | Current Key | Limit | Window |
|-------|-------------|-------|--------|
| `/api/checkout` | `checkout:${user.id}` | 10 | 1 h |
| `/api/promotions/validate` | `promo-validate:${user.id}` | 30 | 1 m |
| `/api/availability` | `availability:${ip}` | 60 | 1 m |
| `/api/waitlist-v2/config` | `waitlist-config:${ip}` | 30 | 1 m |

## Alternative: Netlify Blobs / Vercel KV

If using Netlify Blobs or Vercel KV, a similar pattern with a custom sliding-window implementation is possible.

## Rollback

If Upstash is unavailable, the fallback to in-memory ensures the app continues to work (with reduced protection under load).
