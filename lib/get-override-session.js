import { cookies } from 'next/headers'
import { createAdminClient } from './supabase-admin'

const COOKIE_NAME = 'sr-override'

/**
 * Returns the active override session for the current admin, or null.
 * Checks the httpOnly cookie, then validates it against the DB.
 */
export async function getOverrideSession(adminId) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(COOKIE_NAME)?.value
    if (!sessionId) return null

    const admin = createAdminClient()
    const { data } = await admin
      .from('admin_override_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('admin_id', adminId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    return data ?? null
  } catch {
    return null
  }
}

export { COOKIE_NAME as OVERRIDE_COOKIE_NAME }
