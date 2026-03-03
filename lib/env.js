/**
 * Central environment configuration for SnapReserve.
 * Import this wherever you need to know the current environment.
 *
 * Set NEXT_PUBLIC_APP_ENV in your deployment:
 *   staging    → staging.snapreserve.app  (Stripe TEST keys)
 *   production → snapreserve.app          (Stripe LIVE keys)
 *   (anything else defaults to development)
 */

export const APP_ENV     = process.env.NEXT_PUBLIC_APP_ENV || 'development'
export const IS_PRODUCTION  = APP_ENV === 'production'
export const IS_STAGING     = APP_ENV === 'staging'
export const IS_DEVELOPMENT = !IS_PRODUCTION && !IS_STAGING

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (IS_PRODUCTION ? 'https://snapreserve.app' :
   IS_STAGING    ? 'https://staging.snapreserve.app' :
                   'http://localhost:3000')

// Stripe webhook endpoints (register these in your Stripe dashboard per environment)
export const WEBHOOK_PATH = '/api/webhooks/stripe'

// Server-side startup log — only runs once when Next.js server initialises
if (typeof window === 'undefined') {
  const envLabel =
    IS_PRODUCTION  ? '🟢 PRODUCTION'  :
    IS_STAGING     ? '🟡 STAGING'     :
                     '🔵 DEVELOPMENT'
  console.log(`[SnapReserve] Running in ${envLabel} mode | ${APP_URL}`)
}
