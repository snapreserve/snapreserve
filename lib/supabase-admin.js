import { createClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase client using the service role key.
 * This client bypasses RLS entirely.
 * NEVER import this in any Client Component or expose it to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
