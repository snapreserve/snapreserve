/** @type {import('next').NextConfig} */

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development'

console.log(`[SnapReserve™] next.config — building for: ${APP_ENV.toUpperCase()}`)

// ── Security headers ──────────────────────────────────────────────
// Applied on all routes. CSP allows Stripe, Google Fonts/Places,
// and Supabase storage — everything the app actually loads.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' js.stripe.com maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  // images.unsplash.com: city fallbacks still served as raw <img> on some pages
  // *.googleusercontent.com: Google OAuth avatar URLs
  "img-src 'self' data: blob: *.supabase.co images.unsplash.com *.googleusercontent.com",
  "connect-src 'self' *.supabase.co wss://*.supabase.co api.stripe.com hooks.stripe.com api.resend.com maps.googleapis.com",
  "frame-src js.stripe.com hooks.stripe.com",
  "frame-ancestors 'none'",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy',   value: CSP },
  // Enforce HTTPS for 2 years; include subdomains; eligible for browser preload lists
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Allow popups (needed for Stripe 3DS and Google OAuth) but keep same-origin isolation
  { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin-allow-popups' },
  // Prevent other origins from reading our resources (images, fonts, API responses)
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
]

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_ENV: APP_ENV,
  },

  // ── HTTP security headers on every response ──────────────────────
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
    ]
  },

  // ── Next.js Image Optimization ───────────────────────────────────
  // Allows next/image to fetch, resize, and convert these remote hosts.
  // Format preference: AVIF (best compression) → WebP → original.
  images: {
    remotePatterns: [
      // Supabase Storage — property photos, host ID docs, avatars
      { protocol: 'https', hostname: '*.supabase.co' },
      // Unsplash — city fallback images
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Google OAuth avatars
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    // Reasonable device size breakpoints for responsive srcsets
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for 7 days (default is 60s)
    minimumCacheTTL: 604800,
  },
}

export default nextConfig
