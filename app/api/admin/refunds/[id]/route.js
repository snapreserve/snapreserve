import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // trust_safety cannot approve/deny refunds (finance can, per admin-permissions)
  if (role === 'trust_safety') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, notes } = body

  if (action !== 'approve' && action !== 'deny') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: refund } = await adminClient
    .from('refund_requests')
    .select('*, bookings(total_amount)')
    .eq('id', id)
    .single()

  if (!refund) {
    return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })
  }

  if (refund.status !== 'pending') {
    return NextResponse.json({ error: 'Refund already processed' }, { status: 400 })
  }

  if (action === 'approve') {
    // Support role: limited to ≤$100 AND ≤20% of booking total
    if (role === 'support') {
      const bookingTotal = refund.bookings?.total_amount ?? 0
      const maxPct = bookingTotal * 0.2
      if (refund.amount > 100 || refund.amount > maxPct) {
        return NextResponse.json({
          error: 'Support can only approve refunds ≤$100 and ≤20% of booking total',
        }, { status: 403 })
      }
    }

    // Rate limit: max 20 refund approvals per admin per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await adminClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', user.id)
      .like('action', 'refund.%')
      .gte('created_at', oneHourAgo)

    if ((recentCount ?? 0) >= 20) {
      return NextResponse.json({ error: 'Rate limit exceeded: max 20 refund approvals per hour' }, { status: 429 })
    }

    const now = new Date().toISOString()
    const { error: refundUpdateError } = await adminClient
      .from('refund_requests')
      .update({ status: 'approved', approved_by: user.id, approved_at: now, notes: notes ?? null })
      .eq('id', id)

    if (refundUpdateError) {
      return NextResponse.json({ error: refundUpdateError.message }, { status: 500 })
    }

    await adminClient
      .from('bookings')
      .update({ payment_status: 'refund_pending' })
      .eq('id', refund.booking_id)

    await logAction({
      actorId:    user.id,
      actorEmail: user.email,
      actorRole:  role,
      action:     'refund.approved',
      targetType: 'refund_request',
      targetId:   id,
      beforeData: refund,
      afterData:  { ...refund, status: 'approved', amount: refund.amount },
      ipAddress:  ip,
      userAgent:  ua,
    })
  } else {
    const { error: refundUpdateError } = await adminClient
      .from('refund_requests')
      .update({ status: 'denied', approved_by: user.id, approved_at: new Date().toISOString(), notes: notes ?? null })
      .eq('id', id)

    if (refundUpdateError) {
      return NextResponse.json({ error: refundUpdateError.message }, { status: 500 })
    }

    await logAction({
      actorId:    user.id,
      actorEmail: user.email,
      actorRole:  role,
      action:     'refund.denied',
      targetType: 'refund_request',
      targetId:   id,
      beforeData: refund,
      afterData:  { ...refund, status: 'denied' },
      ipAddress:  ip,
      userAgent:  ua,
    })
  }

  return NextResponse.json({ success: true })
}
