import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = body.reason?.trim() ?? ''

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  // Fetch booking and verify ownership
  const { data: booking, error: fetchErr } = await admin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .eq('guest_id', user.id)
    .maybeSingle()

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a booking with status "${booking.status}"` },
      { status: 409 }
    )
  }

  // Compute refund via DB function
  const { data: refundData } = await admin
    .rpc('compute_refund', {
      p_policy: booking.cancellation_policy,
      p_check_in: booking.check_in,
      p_amount: booking.total_amount,
    })

  const refundAmount = refundData ?? 0
  const now = new Date().toISOString()

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: user.id,
      cancellation_reason: reason || null,
      refund_amount: refundAmount,
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: 'guest',
    action: 'booking.cancelled',
    targetType: 'booking',
    targetId: id,
    beforeData: { status: booking.status, total_amount: booking.total_amount },
    afterData: { status: 'cancelled', refund_amount: refundAmount },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true, refund_amount: refundAmount })
}
