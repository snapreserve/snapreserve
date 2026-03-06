import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { notifyHost } from '@/lib/notify-host'

export async function GET(_req, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select(`
      *,
      listings(id, title, city, state, type, price_per_night),
      guest:users!bookings_guest_id_fkey(id, full_name, email),
      host:users!bookings_host_id_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(booking)
}

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and super_admin can cancel bookings
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, reason } = body

  if (action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'reason required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: booking } = await adminClient
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (['cancelled', 'refunded', 'completed'].includes(booking.status)) {
    return NextResponse.json({ error: `Cannot cancel a booking with status "${booking.status}"` }, { status: 400 })
  }

  const now = new Date().toISOString()
  const updatePayload = {
    status:                 'cancelled',
    admin_cancelled_at:     now,
    admin_cancel_reason:    reason,
    cancelled_by_admin_id:  user.id,
    cancelled_by_role:      'admin',
    cancelled_by_id:        user.id,
  }

  const { error: updateError } = await adminClient
    .from('bookings')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Restore room inventory if this was a hotel booking
  if (booking.room_id) {
    await adminClient.rpc('restore_room_units', { p_room_id: booking.room_id, p_amount: 1 })
  }

  // Notify host
  try {
    const { data: hostRow } = await adminClient.from('hosts').select('user_id').eq('id', booking.host_id).maybeSingle()
    if (hostRow?.user_id) {
      await notifyHost({
        hostUserId: hostRow.user_id,
        listingId:  booking.listing_id,
        type:       'warning',
        subject:    'Booking cancelled by SnapReserve™ Admin',
        body:       `Booking #${booking.reference || id.slice(0,8).toUpperCase()} has been cancelled by a SnapReserve™ admin. Reason: ${reason}. Check-in was ${booking.check_in}.`,
      })
    }
  } catch (e) { console.error('[admin-cancel] notify-host error:', e.message) }

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     'booking.cancel',
    targetType: 'booking',
    targetId:   id,
    beforeData: booking,
    afterData:  { ...booking, ...updatePayload },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true })
}
