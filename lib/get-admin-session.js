import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Shared auth check for API Route Handlers.
 * Returns { user, role, error }.
 * - role is null if user has no active admin_roles row.
 * - error is a string if unauthenticated.
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

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { user: null, role: null, error: 'unauthenticated' }
  }

  // RLS allows users to read their own admin_roles row
  const { data: roleRow } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return { user, role: roleRow?.role ?? null, error: null }
}
