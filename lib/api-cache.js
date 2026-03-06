/**
 * Simple in-memory TTL cache for server-side API calls.
 * Useful for caching expensive aggregations (stats, counts, etc.)
 * that don't need real-time accuracy.
 *
 * Usage:
 *   import { cache } from '@/lib/api-cache'
 *   const data = await cache.get('stats:overview', 60, () => fetchStats())
 */

class TTLCache {
  constructor() {
    this._store = new Map()
  }

  /**
   * Get a cached value or compute it.
   *
   * @param {string} key
   * @param {number} ttlSeconds
   * @param {() => Promise<T>} fetchFn
   * @returns {Promise<T>}
   */
  async get(key, ttlSeconds, fetchFn) {
    const entry = this._store.get(key)
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value
    }

    const value = await fetchFn()
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
    return value
  }

  /** Invalidate a specific key */
  invalidate(key) {
    this._store.delete(key)
  }

  /** Invalidate all keys matching a prefix */
  invalidatePrefix(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key)
    }
  }

  /** Clear everything */
  clear() {
    this._store.clear()
  }
}

// Singleton — persists for the lifetime of the Node.js process
export const cache = new TTLCache()
