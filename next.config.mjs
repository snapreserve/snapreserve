/** @type {import('next').NextConfig} */

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development'

// Log which environment this build targets
console.log(`[SnapReserve] next.config — building for: ${APP_ENV.toUpperCase()}`)

const nextConfig = {
  // Ensure NEXT_PUBLIC_APP_ENV is always available even if not set in the
  // deployment environment (falls back to 'development')
  env: {
    NEXT_PUBLIC_APP_ENV: APP_ENV,
  },
}

export default nextConfig
