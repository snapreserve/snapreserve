import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const MAIN_SITE = 'https://snapreserve.app'
const CONSOLE_HOST = 'console.snapreserve.app'

// Inline base64url decode — works in Edge Runtime (no Buffer)
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export async function middleware(request) {
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
  // /home — preview access gate (httpOnly cookie set by Server Action)
  // ----------------------------------------------------------------
  if (path === '/home' || path.startsWith('/home/')) {
    if (!request.cookies.get('preview_access')?.value) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // ----------------------------------------------------------------
  // Main site — /admin and /superadmin route protection
  // ----------------------------------------------------------------
  const isAdminRoute = path.startsWith('/admin')
  const isSuperAdminRoute = path.startsWith('/superadmin')

  if (isAdminRoute || isSuperAdminRoute) {
    const isMfaPage = path === '/admin/mfa-setup' || path === '/admin/mfa-verify'

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
  const protectedRoutes = ['/dashboard', '/host', '/booking', '/trips', '/account']
  const isProtected = protectedRoutes.some(r => path.startsWith(r))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
