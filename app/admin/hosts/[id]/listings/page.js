import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HostListingsClient from './HostListingsClient'

export default async function HostListingsPage({ params }) {
  const { id: hostId } = await params
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/hosts')
  if (error === 'mfa_required')    redirect('/admin/mfa-verify?next=/admin/hosts')
  if (!role) redirect('/login?error=no_admin_role')

  const admin = createAdminClient()
  const { data: host } = await admin.from('hosts').select('id, display_name, user_id').eq('id', hostId).maybeSingle()
  if (!host) redirect('/admin/hosts')

  const { data: userRow } = host.user_id
    ? await admin.from('users').select('full_name, email').eq('id', host.user_id).maybeSingle()
    : { data: null }

  const { data: listings, count } = await admin
    .from('listings')
    .select('id, title, city, state, status, is_active, price_per_night, rating, review_count, type, created_at', { count: 'exact' })
    .eq('host_id', hostId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(0, 49)

  return (
    <HostListingsClient
      hostId={hostId}
      hostName={host.display_name || userRow?.full_name || userRow?.email || 'Host'}
      initialListings={listings || []}
      initialTotal={count ?? 0}
    />
  )
}
