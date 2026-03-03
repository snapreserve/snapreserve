import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Returns { user, supabase } for any authenticated user API route.
 * Uses the anon key — RLS applies to all queries made with the returned client.
 * user is null if not authenticated.
 */
export async function getUserSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user: error ? null : user, supabase }
}
