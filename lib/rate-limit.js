// lib/rate-limit.js
// In-memory sliding window rate limiter for Next.js API routes.
// State lives per-process — adequate for single-instance deploys.
// For horizontally-scaled production, see docs/rate-limit-migration-plan.md
// for migration to Upstash Redis or similar shared store.

const windows = new Map() // key → number[] of timestamps

/**
 * Check whether `key` has exceeded its rate limit.
 *
 * @param {string} key      Unique bucket key (e.g. "checkout:uid" or "validate:ip")
 * @param {number} limit    Max requests allowed inside the window
 * @param {number} windowMs Window duration in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit(key, limit, windowMs) {
  const now    = Date.now()
  const cutoff = now - windowMs

  // Prune expired timestamps, then check
  const timestamps = (windows.get(key) ?? []).filter(t => t > cutoff)
  const allowed    = timestamps.length < limit

  if (allowed) timestamps.push(now)
  windows.set(key, timestamps)

  return {
    allowed,
    remaining: Math.max(0, limit - timestamps.length),
    // Oldest timestamp in window tells us when a slot opens up
    resetAt: timestamps[0] ? timestamps[0] + windowMs : now + windowMs,
  }
}

/**
 * Extract the real client IP from proxy-forwarded headers.
 * Falls back to 'unknown' when running without a reverse proxy (local dev).
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Build a standard 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(resetAt) {
  const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000)
  return Response.json(
    { error: 'Too many requests. Please slow down and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After':       String(retryAfterSec),
        'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
      },
    }
  )
}
