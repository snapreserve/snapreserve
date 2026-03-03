import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import HostsClient from './HostsClient'

async function getHosts() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('hosts')
    .select('id, user_id, verification_status, suspended_at, suspension_reason, created_at, users(email, full_name, is_active)')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function HostsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/hosts')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/hosts')
  if (!role) redirect('/login?error=no_admin_role')

  const hosts = await getHosts()
  return <HostsClient initialHosts={hosts} role={role} />
}
