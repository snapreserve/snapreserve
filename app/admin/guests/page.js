export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

async function getGuests() {
  const admin = createAdminClient()

  const [{ data: users }, { data: bookingRows }] = await Promise.all([
    admin
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    admin
      .from('bookings')
      .select('guest_id, total_amount')
      .not('status', 'in', '("cancelled","pending")'),
  ])

  const statsMap = {}
  for (const b of bookingRows ?? []) {
    if (!statsMap[b.guest_id]) statsMap[b.guest_id] = { count: 0, total: 0 }
    statsMap[b.guest_id].count++
    statsMap[b.guest_id].total += b.total_amount ?? 0
  }

  return (users ?? []).map(u => ({
    ...u,
    booking_count: statsMap[u.id]?.count ?? 0,
    total_spent:   statsMap[u.id]?.total ?? 0,
  }))
}

export default async function GuestsPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/guests')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/guests')
  if (!role) redirect('/login?error=no_admin_role')

  let guests = []
  try {
    guests = await getGuests()
  } catch (err) {
    console.error('[admin/guests] getGuests failed:', err?.message ?? err)
  }
  return <GuestsClient initialGuests={guests} role={role} />
}
