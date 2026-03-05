import { NextResponse } from 'next/server'

// Routes that always bypass the site lock
const ALLOWED_PREFIXES = [
  '/waitlist',
  '/admin',
  '/superadmin',
  '/api',
  '/auth',
  '/_next',
  '/favicon',
  '/login',
  '/signup',
]

// Simple in-process cache (per worker instance, ~30 s TTL)
let cachedEnabled = null
let cacheExpiry   = 0
const CACHE_TTL   = 30_000

async function isWaitlistV2Enabled() {
  const now = Date.now()
  if (cachedEnabled !== null && now < cacheExpiry) return cachedEnabled

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/platform_settings?key=eq.waitlist_v2_enabled&select=value`
    const res = await fetch(url, {
      headers: {
        apikey:        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    })
    if (!res.ok) return false
    const rows = await res.json()
    const enabled = rows?.[0]?.value === true
    cachedEnabled = enabled
    cacheExpiry   = now + CACHE_TTL
    return enabled
  } catch {
    return false
  }
}

/**
 * Returns true if the request has a Supabase auth session cookie.
 * Authenticated users (admins, hosts, guests) always bypass the waitlist lock —
 * only unauthenticated visitors get sent to /waitlist.
 */
function hasAuthSession(request) {
  return request.cookies.getAll().some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // 1. Always-allowed paths (admin portal, API, auth callbacks, etc.)
  const isAllowed = ALLOWED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  )
  if (isAllowed) return NextResponse.next()

  // 2. Authenticated users (admins, existing members) are never locked out
  if (hasAuthSession(request)) return NextResponse.next()

  // 3. Check waitlist v2 lock — only affects unauthenticated visitors
  const locked = await isWaitlistV2Enabled()
  if (locked) {
    const url = request.nextUrl.clone()
    url.pathname = '/waitlist'
    url.search   = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)).*)',
  ],
}
