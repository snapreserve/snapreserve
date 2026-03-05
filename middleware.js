import { NextResponse } from 'next/server'

// Routes that bypass the waitlist lock
const ALLOWED_PREFIXES = [
  '/waitlist',
  '/admin',
  '/superadmin',
  '/api',
  '/auth',
  '/_next',
  '/favicon',
]

// Simple in-process cache (per edge worker instance)
let cachedEnabled = null
let cacheExpiry   = 0
const CACHE_TTL   = 30_000 // 30 seconds

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
      // Edge-friendly cache hint
      next: { revalidate: 30 },
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

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Check if this path is always allowed
  const isAllowed = ALLOWED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?'))
  if (isAllowed) return NextResponse.next()

  // Check waitlist v2 lock
  const locked = await isWaitlistV2Enabled()
  if (locked) {
    const url = request.nextUrl.clone()
    url.pathname = '/waitlist'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files, images, and fonts.
     * We still run the middleware on all app routes.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)).*)',
  ],
}
