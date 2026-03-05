import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import BookingDetailClient from './BookingDetailClient'

export const dynamic = 'force-dynamic'

export default async function HostBookingDetailPage({ params }) {
  const { id } = await params
  const { user } = await getUserSession()
  if (!user) redirect('/login?next=/host/dashboard')

  const admin = createAdminClient()

  // Resolve host org user_id
  let hostUserId = null
  const { data: directHost } = await admin.from('hosts').select('id, user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id').eq('user_id', user.id).eq('status', 'active').neq('role', 'owner').maybeSingle()
    if (mem) {
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
    }
  }

  if (!hostUserId) redirect('/host/dashboard')

  // Lazy auto-complete: checked_in bookings past checkout
  await admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('host_id', hostUserId)
    .eq('status', 'checked_in')
    .lt('check_out', new Date().toISOString().slice(0, 10))

  const { data: booking } = await admin
    .from('bookings')
    .select('*, listings(id, title, city, state, country, type, bedrooms, bathrooms, max_guests, price_per_night, cancellation_policy)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) redirect('/host/dashboard')

  const { data: guest } = booking.guest_id
    ? await admin.from('users').select('id, full_name, email, created_at').eq('id', booking.guest_id).maybeSingle()
    : { data: null }

  const { data: guestBookings } = booking.guest_id
    ? await admin.from('bookings').select('id, listing_id, status, check_in, check_out, nights, total_amount, listings(title)').eq('guest_id', booking.guest_id).eq('status', 'completed').order('check_in', { ascending: false }).limit(20)
    : { data: [] }

  const pastStaysHere = (guestBookings || []).filter(b => b.listing_id === booking.listing_id && b.id !== id)
  const hostEarnings = Math.max(0, (Number(booking.total_amount) || 0) - (Number(booking.service_fee) || 0))

  // Host display name
  const { data: hostProfile } = await admin.from('users').select('full_name').eq('id', user.id).maybeSingle()

  return (
    <BookingDetailClient
      booking={{ ...booking, host_earnings: Math.round(hostEarnings * 100) / 100 }}
      guest={{
        full_name:   guest?.full_name  || '—',
        email:       guest?.email      || '',
        created_at:  guest?.created_at || null,
        total_stays: (guestBookings || []).length,
        stays_here:  pastStaysHere.length,
      }}
      pastStaysHere={pastStaysHere.slice(0, 5)}
      hostName={hostProfile?.full_name || ''}
    />
  )
}
