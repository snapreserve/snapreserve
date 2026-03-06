import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { notifyHost } from '@/lib/notify-host'
import { headers } from 'next/headers'

// POST /api/host/bookings/[id]/cancel
// Hosts can cancel bookings for properties they own or manage
export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = body.reason?.trim() ?? ''

  if (!reason) return NextResponse.json({ error: 'Cancellation reason required' }, { status: 400 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  // Resolve the host's organisation user_id (direct host or team member)
  let hostUserId = null
  let ownerHostRow = null

  const { data: directHost } = await admin
    .from('hosts')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (directHost) {
    hostUserId = user.id
    ownerHostRow = directHost
  } else {
    const { data: membership } = await admin
      .from('host_team_members')
      .select('host_id, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membership) {
      // Only owner/manager roles can cancel bookings
      if (!['owner', 'manager'].includes(membership.role)) {
        return NextResponse.json({ error: 'Only managers and the owner can cancel bookings' }, { status: 403 })
      }
      const { data: orgHost } = await admin
        .from('hosts')
        .select('id, user_id')
        .eq('id', membership.host_id)
        .maybeSingle()
      if (orgHost) {
        hostUserId = orgHost.user_id
        ownerHostRow = orgHost
      }
    }
  }

  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  // Fetch booking — must belong to this host
  const { data: booking } = await admin
    .from('bookings')
    .select('*, listings(title)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return NextResponse.json({ error: `Cannot cancel a booking with status "${booking.status}"` }, { status: 409 })
  }

  // Compute refund (host cancellations typically give full refund to guest)
  const { data: refundData } = await admin.rpc('compute_refund', {
    p_policy:   'flexible',   // host cancellations always give full refund
    p_check_in: booking.check_in,
    p_amount:   booking.total_amount,
  })
  const refundAmount = refundData ?? booking.total_amount  // full refund fallback

  const now = new Date().toISOString()

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      status:              'cancelled',
      cancelled_at:         now,
      cancelled_by_role:   'host',
      cancelled_by_id:      user.id,
      cancellation_reason:  reason,
      refund_amount:        refundAmount,
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Restore room inventory if this was a hotel booking
  if (booking.room_id) {
    await admin.rpc('restore_room_units', { p_room_id: booking.room_id, p_amount: 1 })
  }

  // Notify the host (owner) — they get an in-app message if a team member cancelled
  if (ownerHostRow?.user_id && ownerHostRow.user_id !== user.id) {
    try {
      await notifyHost({
        hostUserId: ownerHostRow.user_id,
        listingId:  booking.listing_id,
        type:       'warning',
        subject:    'Booking cancelled by team member',
        body:       `A team member cancelled booking #${booking.reference || id.slice(0,8).toUpperCase()} for "${booking.listings?.title || 'your property'}". Check-in was ${booking.check_in}.\n\nReason: ${reason}`,
      })
    } catch (e) { console.error('[cancel-by-host] notify owner error:', e.message) }
  }

  // NOTE: Guest email notification stub — no guest_messages table exists yet.
  // TODO: Send email to guest when email service is configured.

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  'host',
    action:     'booking.cancelled_by_host',
    targetType: 'booking',
    targetId:   id,
    beforeData: { status: booking.status, total_amount: booking.total_amount },
    afterData:  { status: 'cancelled', cancelled_by_role: 'host', refund_amount: refundAmount },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true, refund_amount: refundAmount })
}
