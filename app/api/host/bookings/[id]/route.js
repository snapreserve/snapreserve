import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'
import { bookingHostPayout, calcPlatformFee } from '@/lib/platform-fee'
import { notifyHost } from '@/lib/notify-host'
import { sendEmail, bookingConfirmationEmailHtml, bookingConfirmationEmailText } from '@/lib/send-email'

// PATCH /api/host/bookings/[id]  — confirm, reject, or update host_notes
export async function PATCH(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  // Resolve caller's host org user_id + role
  let hostUserId = null
  let callerRole = 'owner'
  const { data: directHost } = await admin.from('hosts').select('user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id, role').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (mem) {
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
      callerRole = mem.role
    }
  }
  if (!hostUserId) return NextResponse.json({ error: 'No host found' }, { status: 403 })

  const { action, host_notes } = body

  // ── confirm (approve pending booking) ───────────────────────────────────
  if (action === 'confirm') {
    if (!['owner', 'manager'].includes(callerRole)) {
      return NextResponse.json({ error: 'Only owner or manager can approve bookings' }, { status: 403 })
    }

    const { data: booking } = await admin
      .from('bookings')
      .select('id, status, guest_id, check_in, check_out, nights, guests, total_amount, reference, listings(title, city, state)')
      .eq('id', id)
      .eq('host_id', hostUserId)
      .maybeSingle()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.status !== 'pending') {
      return NextResponse.json({ error: `Booking is already ${booking.status}` }, { status: 400 })
    }

    const { error } = await admin
      .from('bookings')
      .update({ status: 'confirmed', payment_status: 'paid' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify guest — email + in-app
    try {
      const { data: guestUser } = await admin.auth.admin.getUserById(booking.guest_id)
      const guestEmail = guestUser?.user?.email
      const { data: guestProfile } = await admin.from('users').select('full_name').eq('id', booking.guest_id).maybeSingle()
      const guestName = guestProfile?.full_name?.split(' ')[0] || 'there'
      const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
      const tripsUrl  = `${baseUrl}/account/trips?booking=${id}`

      if (guestEmail) {
        await sendEmail({
          to:      guestEmail,
          subject: `Booking confirmed — ${booking.listings?.title || 'your stay'}`,
          html:    bookingConfirmationEmailHtml({
            guestName,
            listingTitle: booking.listings?.title,
            city:         booking.listings?.city,
            state:        booking.listings?.state,
            checkIn:      booking.check_in,
            checkOut:     booking.check_out,
            nights:       booking.nights,
            guests:       booking.guests,
            total:        booking.total_amount,
            reference:    booking.reference,
            tripsUrl,
          }),
          text: bookingConfirmationEmailText({
            guestName,
            listingTitle: booking.listings?.title,
            city:         booking.listings?.city,
            state:        booking.listings?.state,
            checkIn:      booking.check_in,
            checkOut:     booking.check_out,
            nights:       booking.nights,
            guests:       booking.guests,
            total:        booking.total_amount,
            reference:    booking.reference,
            tripsUrl,
          }),
        })
      }
    } catch (notifyErr) {
      console.error('[host/bookings] confirm notify error:', notifyErr.message)
    }

    return NextResponse.json({ ok: true, status: 'confirmed' })
  }

  // ── host_notes update ────────────────────────────────────────────────────
  const { error } = await admin.from('bookings').update({ host_notes }).eq('id', id).eq('host_id', hostUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// GET /api/host/bookings/[id]  — full booking detail for the host detail page
export async function GET(request, { params }) {
  const { user } = await getHostUser(request)
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

  // Guest profile; if guest account is deleted, do not expose booking detail
  const { data: guest } = booking.guest_id
    ? await admin.from('users').select('id, full_name, email, created_at, deleted_at').eq('id', booking.guest_id).maybeSingle()
    : { data: null }
  if (booking.guest_id && (guest?.deleted_at != null)) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

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
