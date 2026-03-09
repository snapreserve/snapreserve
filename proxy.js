import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const MAIN_SITE = 'https://snapreserve.app'
const CONSOLE_HOST = 'console.snapreserve.app'
const STATUS_HOST = 'status.snapreserve.app'

// Waitlist v2 site-lock cache (~30 s TTL per worker instance)
let _waitlistEnabled = null
let _waitlistExpiry  = 0

async function isWaitlistV2Enabled(supabase) {
  const now = Date.now()
  if (_waitlistEnabled !== null && now < _waitlistExpiry) return _waitlistEnabled
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'waitlist_v2_enabled')
      .maybeSingle()
    _waitlistEnabled = data?.value === true
    _waitlistExpiry  = now + 30_000
    return _waitlistEnabled
  } catch {
    return false
  }
}

// Super admin / owner email — bypasses waitlist; must have super_admin role in admin_roles for /admin and /superadmin
function isOwnerEmail(user) {
  return user?.email === 'owner@snapreserve.app'
}

const _approvalCache = new Map() // userId → { status, isTeamMember, expiry }
async function getUserProfile(supabase, userId) {
  const cached = _approvalCache.get(userId)
  if (cached && Date.now() < cached.expiry) return cached
  try {
    const { data } = await supabase
      .from('users')
      .select('approval_status, is_team_member')
      .eq('id', userId)
      .maybeSingle()
    // Team members are explicitly invited by a host — they bypass the waitlist gate
    // regardless of approval_status, so they can always reach the host portal.
    const isTeamMember = data?.is_team_member === true
    const status = isTeamMember ? 'approved' : (data?.approval_status ?? 'pending')
    const entry = { status, isTeamMember, expiry: Date.now() + 60_000 }
    _approvalCache.set(userId, entry)
    return entry
  } catch { return { status: 'pending', isTeamMember: false } } // fail closed
}

// Inline base64url decode — works in Edge Runtime (no Buffer)
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always call getUser() first — refreshes session if needed
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const hostname = request.headers.get('host') ?? ''
  const isConsoleSubdomain = hostname === CONSOLE_HOST
  const isStatusSubdomain = hostname === STATUS_HOST

  // /account/admin → /admin (admin portal lives at /admin)
  if (path === '/account/admin' || path.startsWith('/account/admin/')) {
    const url = request.nextUrl.clone()
    url.pathname = path === '/account/admin' ? '/admin' : '/admin' + path.slice('/account/admin'.length)
    return NextResponse.redirect(url)
  }

  // ----------------------------------------------------------------
  // status.snapreserve.app — serve /status, no auth required
  // ----------------------------------------------------------------
  if (isStatusSubdomain) {
    const url = request.nextUrl.clone()
    url.pathname = path === '/' ? '/status' : path
    return NextResponse.rewrite(url)
  }

  // ----------------------------------------------------------------
  // Maintenance mode — redirect all non-admin traffic
  // ----------------------------------------------------------------
  const isAdminOrSuperAdmin = path.startsWith('/admin') || path.startsWith('/superadmin')
  const isMaintenancePage = path === '/maintenance'
  const isApiAdminRoute = path.startsWith('/api/admin') || path.startsWith('/api/superadmin')
  // These API routes must work even during maintenance
  const isPaymentApiRoute = path.startsWith('/api/webhooks') || path.startsWith('/api/checkout')

  const isPublicBypassPath =
    isAdminOrSuperAdmin || isMaintenancePage ||
    isConsoleSubdomain  || isStatusSubdomain ||
    isApiAdminRoute     || isPaymentApiRoute ||
    path.startsWith('/api/') || path.startsWith('/auth/')

  // ----------------------------------------------------------------
  // Waitlist v2 + Approval gate
  // Applies to ALL non-owner consumer traffic; admin routes are exempt
  // ----------------------------------------------------------------
  if (!isPublicBypassPath && !isAdminOrSuperAdmin) {
    const isOwner = isOwnerEmail(user)
    const isBypassPath =
      path === '/waitlist' || path.startsWith('/waitlist/') ||
      path === '/login'    || path === '/signup' ||
      path === '/pending-approval' ||
      // Team invite join page — must be reachable by unauthenticated/unapproved users
      // since invitees may not have an account yet or may not be waitlist-approved
      path.startsWith('/team/join')

    if (!isOwner && !isBypassPath) {
      if (user) {
        // Authenticated: check approval status
        // Approved users bypass the waitlist lock entirely
        const profile = await getUserProfile(supabase, user.id)
        if (profile.status !== 'approved') {
          const url = request.nextUrl.clone()
          url.pathname = '/waitlist'
          url.search   = ''
          return NextResponse.redirect(url)
        }
        // approved → fall through, no waitlist check
      } else {
        // Unauthenticated: waitlist lock applies
        const locked = await isWaitlistV2Enabled(supabase)
        if (locked) {
          const url = request.nextUrl.clone()
          url.pathname = '/waitlist'
          url.search   = ''
          return NextResponse.redirect(url)
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // Maintenance mode — redirect all non-admin traffic
  // ----------------------------------------------------------------
  if (!isPublicBypassPath && !isMaintenancePage) {
    const { data: maintenanceSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    if (maintenanceSetting?.value === true) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.redirect(url)
    }
  }

  // ----------------------------------------------------------------
  // console.snapreserve.app — entire subdomain requires admin role
  // ----------------------------------------------------------------
  if (isConsoleSubdomain) {
    // Root of console subdomain → admin dashboard
    if (path === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    const isMfaPage = path === '/admin/mfa-setup' || path === '/admin/mfa-verify'

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    if (!isMfaPage) {
      // Check MFA enrollment
      const { data: enrollData } = await supabase.auth.mfa.listFactors()
      const hasEnrolledFactor = (enrollData?.totp?.length ?? 0) > 0

      if (!hasEnrolledFactor) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/mfa-setup'
        return NextResponse.redirect(url)
      }

      // Check AAL via JWT
      const { data: { session } } = await supabase.auth.getSession()
      const payload = session?.access_token ? decodeJwtPayload(session.access_token) : null
      const aal = payload?.aal ?? 'aal1'

      if (aal !== 'aal2') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/mfa-verify'
        url.searchParams.set('next', path)
        return NextResponse.redirect(url)
      }

      // Check role
      const { data: roleRow } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!roleRow) {
        // Has account but no admin role — send to main site
        return NextResponse.redirect(MAIN_SITE)
      }

      // /superadmin/* requires super_admin role
      if (path.startsWith('/superadmin') && roleRow.role !== 'super_admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  }

  // ----------------------------------------------------------------
  // Main site — /admin and /superadmin route protection
  // ----------------------------------------------------------------
  const isAdminRoute = path.startsWith('/admin')
  const isSuperAdminRoute = path.startsWith('/superadmin')

  if (isAdminRoute || isSuperAdminRoute) {
    const isMfaPage = path === '/admin/mfa-setup' || path === '/admin/mfa-verify'
    // Waitlist page is gated by preview_access cookie only — no MFA needed
    const isWaitlistPage = path === '/admin/waitlist'

    if (isWaitlistPage) {
      if (!request.cookies.get('preview_access')?.value && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Accept-invite page is publicly reachable (no session or MFA required)
    if (path === '/admin/accept-invite') return supabaseResponse

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      return NextResponse.redirect(url)
    }

    if (!isMfaPage) {
      const { data: enrollData } = await supabase.auth.mfa.listFactors()
      const hasEnrolledFactor = (enrollData?.totp?.length ?? 0) > 0

      if (!hasEnrolledFactor) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/mfa-setup'
        return NextResponse.redirect(url)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const payload = session?.access_token ? decodeJwtPayload(session.access_token) : null
      const aal = payload?.aal ?? 'aal1'

      if (aal !== 'aal2') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/mfa-verify'
        url.searchParams.set('next', path)
        return NextResponse.redirect(url)
      }

      const { data: roleRow } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!roleRow) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'no_admin_role')
        return NextResponse.redirect(url)
      }

      if (isSuperAdminRoute && roleRow.role !== 'super_admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  }

  // ----------------------------------------------------------------
  // Existing protected routes (user-facing)
  // ----------------------------------------------------------------
  // Public routes: invite acceptance page + its validation API
  if (path.startsWith('/team/join') || path === '/api/host/team/accept') return supabaseResponse

  const protectedRoutes = ['/dashboard', '/host', '/booking', '/trips', '/account']
  const isProtected = protectedRoutes.some(r => path.startsWith(r))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ----------------------------------------------------------------
  // Team member portal gate — restrict to host portal only
  // Team members (is_team_member=true) have no explore/guest access.
  // If they hit any consumer route, redirect them to /host/dashboard.
  // ----------------------------------------------------------------
  if (user) {
    const TEAM_MEMBER_BLOCKED = ['/home', '/listings', '/property', '/trips', '/booking', '/dashboard']
    const isBlockedForTeam = TEAM_MEMBER_BLOCKED.some(r => path.startsWith(r))
    if (isBlockedForTeam) {
      // getUserProfile is cached (60s TTL) — no extra DB hit if already fetched above
      const profile = await getUserProfile(supabase, user.id)
      if (profile.isTeamMember) {
        const url = request.nextUrl.clone()
        url.pathname = '/host/dashboard'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
