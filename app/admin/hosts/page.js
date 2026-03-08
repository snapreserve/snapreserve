export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import HostsClient from './HostsClient'

async function getHosts() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('hosts')
    .select('id, user_id, verification_status, suspended_at, suspension_reason, created_at, is_snap_verified, snap_verified_at, is_founder_host, users(id, email, full_name, is_active), listings(id, property_type, is_active, status, city, state, rating, review_count, price_per_night)')
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
