/**
 * Performance logging utility for API routes and server components.
 * Logs slow operations (>500ms) to console in dev, and can be wired
 * to an external service in production.
 */

const SLOW_THRESHOLD_MS = 500

/**
 * Wrap an async function with timing + logging.
 *
 * @param {string} label - Human-readable name (e.g. 'GET /api/host/bookings')
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withPerfLog(label, fn) {
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    if (ms > SLOW_THRESHOLD_MS) {
      console.warn(`[PERF SLOW] ${label} — ${ms}ms`)
    } else if (process.env.NODE_ENV === 'development') {
      console.debug(`[PERF] ${label} — ${ms}ms`)
    }
    return result
  } catch (err) {
    const ms = Date.now() - start
    console.error(`[PERF ERROR] ${label} — ${ms}ms`, err?.message)
    throw err
  }
}

/**
 * Timing wrapper that returns { result, ms } without throwing.
 * Useful when you want the duration regardless of success/failure.
 */
export async function timedOp(label, fn) {
  const start = Date.now()
  let result, error
  try {
    result = await fn()
  } catch (err) {
    error = err
  }
  const ms = Date.now() - start
  if (ms > SLOW_THRESHOLD_MS) {
    console.warn(`[PERF SLOW] ${label} — ${ms}ms`)
  }
  if (error) throw error
  return { result, ms }
}
