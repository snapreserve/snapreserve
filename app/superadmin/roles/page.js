import { createAdminClient } from '@/lib/supabase-admin'
import RolesClient from './RolesClient'

async function getRolesData() {
  const sb = createAdminClient()
  const { data: roles } = await sb
    .from('admin_roles')
    .select('id, user_id, role, granted_at, is_active, granted_by')
    .order('granted_at', { ascending: false })

  // Fetch emails for all unique user_ids
  const userIds = [...new Set((roles || []).map(r => r.user_id))]
  const emailMap = {}
  if (userIds.length > 0) {
    for (const uid of userIds) {
      const { data: { user } } = await sb.auth.admin.getUserById(uid)
      if (user) emailMap[uid] = user.email
    }
  }

  return { roles: roles || [], emailMap }
}

export default async function RolesPage() {
  const { roles, emailMap } = await getRolesData()
  return <RolesClient initialRoles={roles} emailMap={emailMap} />
}
