import { createAdminClient } from '@/lib/supabase-admin'
import { getUserSession } from '@/lib/get-user-session'

/**
 * Resolve the current user for host API routes.
 * Accepts EITHER:
 *   - Authorization: Bearer <supabase_access_token>  (mobile app)
 *   - Cookie session (web)
 * Returns { user } or { user: null }. Use for all /api/host/* routes so web and app both work.
 */
export async function getHostUser(request) {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (token) {
    const admin = createAdminClient()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (!error && user) return { user }
  }

  const { user } = await getUserSession()
  return { user: user || null }
}
