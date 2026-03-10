import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'
import { sendEmail, checkInEmailHtml, checkInEmailText } from '@/lib/send-email'

// POST /api/host/bookings/[id]/checkin
export async function POST(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  // Resolve host org user_id (owner or manager/staff can check in)
  let hostUserId = null
  const { data: directHost } = await admin.from('hosts').select('id, user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id, role').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (mem) {
      if (!['owner', 'manager', 'staff'].includes(mem.role)) {
        return NextResponse.json({ error: 'Only managers and staff can confirm check-ins' }, { status: 403 })
      }
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
    }
  }

  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, reference, status, check_in, check_out, nights, guests, listing_id, guest_id, listings(title, city, state)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: `Cannot check in a booking with status "${booking.status}"` }, { status: 409 })
  }

  // Check-in only allowed on the arrival date (not before, not after)
  const checkInDate = (booking.check_in || '').toString().slice(0, 10) // YYYY-MM-DD
  const todayUtc = new Date().toISOString().slice(0, 10)
  if (todayUtc < checkInDate) {
    return NextResponse.json(
      { error: 'Check-in is only allowed on the arrival date. Today is not yet the check-in date.' },
      { status: 400 }
    )
  }
  if (todayUtc > checkInDate) {
    return NextResponse.json(
      { error: 'Check-in can only be done on the arrival date. Please contact support if the guest arrived on a different day.' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()

  const { error: updateErr } = await admin
    .from('bookings')
    .update({ status: 'checked_in', checked_in_at: now })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  'host',
    action:     'booking.checked_in',
    targetType: 'booking',
    targetId:   id,
    beforeData: { status: 'confirmed' },
    afterData:  { status: 'checked_in', checked_in_at: now },
    ipAddress:  ip,
    userAgent:  ua,
  })

  // Email guest check-in confirmation (non-blocking)
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(booking.guest_id)
    const guestEmail = authUser?.user?.email
    const { data: guestProfile } = await admin.from('users').select('full_name').eq('id', booking.guest_id).maybeSingle()
    const guestName  = guestProfile?.full_name?.split(' ')[0] || authUser?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
    const tripsUrl   = `${baseUrl}/account/trips?booking=${booking.id}`

    if (guestEmail) {
      await sendEmail({
        to:      guestEmail,
        subject: `You're checked in — ${booking.listings?.title || 'your stay'}`,
        html:    checkInEmailHtml({
          guestName,
          listingTitle: booking.listings?.title,
          city:         booking.listings?.city,
          state:        booking.listings?.state,
          checkOut:     booking.check_out,
          nights:       booking.nights,
          guests:       booking.guests,
          reference:    booking.reference,
          tripsUrl,
        }),
        text: checkInEmailText({
          guestName,
          listingTitle: booking.listings?.title,
          city:         booking.listings?.city,
          state:        booking.listings?.state,
          checkOut:     booking.check_out,
          nights:       booking.nights,
          guests:       booking.guests,
          reference:    booking.reference,
          tripsUrl,
        }),
      })
    }
  } catch (emailErr) {
    console.error('[checkin] email error:', emailErr.message)
  }

  return NextResponse.json({ success: true, checked_in_at: now })
}
