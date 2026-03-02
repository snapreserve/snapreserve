import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/**
 * Shared auth check for API Route Handlers.
 * Returns { user, role, error }.
 *
 * Checks (in order):
 *  1. Valid Supabase session (getUser)
 *  2. AAL2 assertion — MFA must have been completed this session
 *  3. Active row in admin_roles
 *
 * - role is null if the user has no active admin_roles row.
 * - error is a string if any check fails.
 */
export async function getAdminSession() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Verify the session token server-side (not just the cookie value)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { user: null, role: null, error: 'unauthenticated' }
  }

  // 2. Verify AAL2 — MFA must have been verified this session.
  //    This prevents an attacker with a stolen AAL1 session cookie from
  //    calling API routes directly, bypassing the middleware MFA check.
  const { data: { session } } = await supabase.auth.getSession()
  const payload = session?.access_token ? decodeJwtPayload(session.access_token) : null
  if (!payload || payload.aal !== 'aal2') {
    return { user: null, role: null, error: 'mfa_required' }
  }

  // 3. Check admin role (RLS allows each user to read their own row)
  const { data: roleRow } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return { user, role: roleRow?.role ?? null, error: null }
}
