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
    .select('*, listings(id, title, city, state, country, property_type, bedrooms, bathrooms, max_guests, price_per_night, cancellation_policy, images, checkin_start_time, checkin_end_time, checkout_time)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) redirect('/host/dashboard')

  const { data: guest } = booking.guest_id
    ? await admin.from('users').select('id, full_name, email, avatar_url, phone, email_confirmed_at, phone_confirmed_at, id_verified, is_verified, created_at').eq('id', booking.guest_id).maybeSingle()
    : { data: null }

  const { data: guestBookings } = booking.guest_id
    ? await admin.from('bookings').select('id, listing_id, status, check_in, check_out, nights, total_amount, listings(title)').eq('guest_id', booking.guest_id).eq('status', 'completed').order('check_in', { ascending: false }).limit(20)
    : { data: [] }

  const pastStaysHere = (guestBookings || []).filter(b => b.listing_id === booking.listing_id && b.id !== id)

  // Fetch room details if hotel booking
  const { data: room } = booking.room_id
    ? await admin.from('rooms').select('id, name, tier, price_per_night, max_guests, bed_type, view_type').eq('id', booking.room_id).maybeSingle()
    : { data: null }

  // Host display name
  const [{ data: hostProfile }, { data: hostRow }, { data: teamMem }] = await Promise.all([
    admin.from('users').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    admin.from('hosts').select('is_founder_host, fee_rate').eq('user_id', user.id).maybeSingle(),
    admin.from('host_team_members').select('role').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
  ])
  const myRole = directHost ? 'owner' : (teamMem?.role || 'owner')

  const isFounder = hostRow?.is_founder_host === true
  const feeRate   = Number(hostRow?.fee_rate ?? 0.08)
  const platformFee      = Number(booking.platform_fee || 0)
  const platformFixedFee = Number(booking.platform_fixed_fee || 0)
  const totalPlatformFee = Math.round((platformFee + platformFixedFee) * 100) / 100
  const fixedHostEarnings = Math.max(0, Math.round((Number(booking.total_amount || 0) - totalPlatformFee) * 100) / 100)

  return (
    <BookingDetailClient
      booking={{
        ...booking,
        host_earnings:      fixedHostEarnings,
        total_platform_fee: totalPlatformFee,
        platform_fee:       platformFee,
        platform_fixed_fee: platformFixedFee,
      }}
      guest={{
        full_name:      guest?.full_name          || '—',
        email:          guest?.email              || '',
        avatar_url:     guest?.avatar_url         || null,
        phone:          guest?.phone              || null,
        email_verified: !!guest?.email_confirmed_at,
        phone_verified: !!guest?.phone_confirmed_at,
        id_verified:    !!guest?.id_verified,
        is_verified:    !!guest?.is_verified,
        created_at:     guest?.created_at         || null,
        total_stays:    (guestBookings || []).length,
        stays_here:     pastStaysHere.length,
      }}
      room={room || null}
      pastStaysHere={pastStaysHere.slice(0, 5)}
      hostName={hostProfile?.full_name || ''}
      hostAvatar={hostProfile?.avatar_url || null}
      isFounder={isFounder}
      feeRate={feeRate}
      myRole={myRole}
    />
  )
}
