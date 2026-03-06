import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import PermissionsClient from './PermissionsClient'
import { MODULES, ACTION_LABELS } from '@/lib/admin-permissions'

export const dynamic = 'force-dynamic'

export default async function PermissionsPage() {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') redirect('/admin')

  const admin = createAdminClient()
  const { data: roles } = await admin
    .from('admin_custom_roles')
    .select('*')
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  return (
    <PermissionsClient
      initialRoles={roles || []}
      modules={MODULES}
      actionLabels={ACTION_LABELS}
    />
  )
}
