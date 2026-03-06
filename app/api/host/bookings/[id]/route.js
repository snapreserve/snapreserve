import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { bookingHostPayout, calcPlatformFee } from '@/lib/platform-fee'

// PATCH /api/host/bookings/[id]  — update host_notes
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { host_notes } = await request.json()
  const admin = createAdminClient()

  let hostUserId = null
  const { data: directHost } = await admin.from('hosts').select('user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (mem) {
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
    }
  }
  if (!hostUserId) return NextResponse.json({ error: 'No host found' }, { status: 403 })

  const { error } = await admin.from('bookings').update({ host_notes }).eq('id', id).eq('host_id', hostUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// GET /api/host/bookings/[id]  — full booking detail for the host detail page
export async function GET(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Resolve host org user_id + team member's allowed listings
  let hostUserId = null
  let allowedListingIds = null
  const { data: directHost } = await admin.from('hosts').select('id, user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id, allowed_listing_ids').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (mem) {
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
      if (Array.isArray(mem.allowed_listing_ids) && mem.allowed_listing_ids.length > 0) {
        allowedListingIds = mem.allowed_listing_ids
      }
    }
  }

  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  // Lazy auto-complete: any checked_in booking past checkout → complete
  await admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('host_id', hostUserId)
    .eq('status', 'checked_in')
    .lt('check_out', new Date().toISOString().slice(0, 10))

  // Fetch booking
  const { data: booking } = await admin
    .from('bookings')
    .select('*, listings(id, title, city, state, country, type, bedrooms, bathrooms, max_guests, price_per_night, cancellation_policy)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Team member property scope — deny if not in allowed listings
  if (allowedListingIds && !allowedListingIds.includes(booking.listing_id)) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Guest profile
  const { data: guest } = booking.guest_id
    ? await admin.from('users').select('id, full_name, email, created_at').eq('id', booking.guest_id).maybeSingle()
    : { data: null }

  // Guest booking history (all their completed stays + this listing's past stays)
  const { data: guestBookings } = booking.guest_id
    ? await admin.from('bookings').select('id, listing_id, status, check_in, check_out, nights, total_amount, listings(title)').eq('guest_id', booking.guest_id).eq('status', 'completed').order('check_in', { ascending: false }).limit(20)
    : { data: [] }

  const pastStaysHere = (guestBookings || []).filter(b => b.listing_id === booking.listing_id && b.id !== booking.id)
  const guestTotalStays = (guestBookings || []).length

  const hostEarnings    = bookingHostPayout(booking)
  const platformFee     = Number(booking.platform_fee)       || 0
  const platformFixedFee = Number(booking.platform_fixed_fee) || 0
  const totalPlatformFee = Math.round((platformFee + platformFixedFee) * 100) / 100

  return NextResponse.json({
    booking: {
      ...booking,
      guest_name:          guest?.full_name || guest?.email || '—',
      guest_email:         guest?.email || '',
      guest_since:         guest?.created_at || null,
      platform_fee:        platformFee,
      platform_fixed_fee:  platformFixedFee,
      total_platform_fee:  totalPlatformFee,
      host_earnings:       hostEarnings,
    },
    guest_stats: {
      total_stays:     guestTotalStays,
      stays_here:      pastStaysHere.length,
    },
    past_stays_here: pastStaysHere.slice(0, 5),
  })
}
