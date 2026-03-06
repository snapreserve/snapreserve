/**
 * Centralised Stripe client for SnapReserve™.
 *
 * Validates that the correct key type is used for each environment:
 *   staging    → must use sk_test_*  (throws if sk_live_* detected)
 *   production → must use sk_live_*  (throws if sk_test_* detected)
 *
 * Lazy-initialised so the module is safe to import at build time
 * even when STRIPE_SECRET_KEY is not set in the build environment.
 *
 * Import this instead of constructing `new Stripe(...)` inline.
 */

import Stripe from 'stripe'
import { APP_ENV, IS_PRODUCTION, IS_STAGING } from './env'

let _stripe = null

export function getStripe() {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY || ''

  if (!key) {
    throw new Error(`[SnapReserve™] STRIPE_SECRET_KEY is not set (${APP_ENV})`)
  }

  // ── Key-type guard ──────────────────────────────────────────────────────────
  // Prevents accidental use of test keys in production or live keys in staging.
  if (IS_PRODUCTION && key.startsWith('sk_test_')) {
    throw new Error(
      '[SnapReserve™] FATAL: Stripe TEST key detected in PRODUCTION environment. ' +
      'Set STRIPE_SECRET_KEY to your sk_live_* key before deploying.'
    )
  }
  if (IS_STAGING && key.startsWith('sk_live_')) {
    throw new Error(
      '[SnapReserve™] FATAL: Stripe LIVE key detected in STAGING environment. ' +
      'Set STRIPE_SECRET_KEY to your sk_test_* key for staging.'
    )
  }

  _stripe = new Stripe(key, { apiVersion: '2024-06-20' })
  return _stripe
}

// Default export for backwards-compat with any direct `import stripe from '@/lib/stripe'` usage.
// Routes that use this must be called at runtime (not statically analysed at build time).
export default new Proxy(
  {},
  {
    get(_target, prop) {
      return getStripe()[prop]
    },
  }
)
