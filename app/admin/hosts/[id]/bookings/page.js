import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import HostBookingsClient from './HostBookingsClient'

export default async function HostBookingsPage({ params }) {
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

  const hostUserId = host.user_id

  // Initial bookings
  const { data: bookingRows, count } = await admin
    .from('bookings')
    .select('id, reference, status, payment_status, total_amount, service_fee, refund_amount, nights, check_in, check_out, guest_id, listing_id, cancelled_by_role, created_at, listings(id, title, city)', { count: 'exact' })
    .eq('host_id', hostUserId)
    .order('created_at', { ascending: false })
    .range(0, 49)

  const guestIds = [...new Set((bookingRows || []).map(b => b.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', guestIds)
    : { data: [] }
  const guestMap = Object.fromEntries((guests || []).map(g => [g.id, g]))

  const bookings = (bookingRows || []).map(b => {
    const g = guestMap[b.guest_id] || {}
    const hostPayout = Math.max(0, (Number(b.total_amount) || 0) - (Number(b.service_fee) || 0))
    const ps = b.status === 'completed' && b.payment_status === 'paid' ? 'released'
      : b.status === 'cancelled' ? 'refunded' : 'pending'
    return {
      id: b.id, reference: b.reference || b.id.slice(0,8).toUpperCase(),
      status: b.status, payment_status: b.payment_status,
      total_amount: b.total_amount, service_fee: b.service_fee,
      host_payout: Math.round(hostPayout * 100) / 100,
      refund_amount: b.refund_amount, nights: b.nights,
      check_in: b.check_in, check_out: b.check_out,
      listing_title: b.listings?.title || '—', listing_city: b.listings?.city || '',
      guest_name: g.full_name || g.email || '—',
      cancelled_by: b.cancelled_by_role || null,
      payout_status: ps, created_at: b.created_at,
    }
  })

  // All listings for filter dropdown
  const { data: listings } = await admin
    .from('listings')
    .select('id, title')
    .eq('host_id', hostId)
    .is('deleted_at', null)
    .order('title')

  return (
    <HostBookingsClient
      hostId={hostId}
      hostName={host.display_name || userRow?.full_name || userRow?.email || 'Host'}
      initialBookings={bookings}
      initialTotal={count ?? 0}
      hostListings={listings || []}
    />
  )
}
