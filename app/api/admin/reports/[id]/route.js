import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { notifyHost } from '@/lib/notify-host'

const ADMIN_ONLY = ['suspend_listing', 'reactivate_listing', 'reject_permanently', 'go_live_listing']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action, resolution_note, assigned_to, priority } = body

  const validActions = [
    'resolve', 'dismiss', 'escalate', 'under_review', 'assign', 'set_priority',
    'reopen', 'suspend_listing', 'reactivate_listing', 'reject_permanently', 'go_live_listing',
  ]
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (ADMIN_ONLY.includes(action) && !['admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: report } = await adminClient
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const now = new Date().toISOString()
  let updatePayload = { updated_at: now }
  let activityDetail = null

  if (action === 'resolve') {
    updatePayload.status = 'resolved'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = resolution_note ?? null
    activityDetail = resolution_note || null
  } else if (action === 'dismiss') {
    updatePayload.status = 'dismissed'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = resolution_note ?? null
    activityDetail = resolution_note || null
  } else if (action === 'escalate') {
    updatePayload.status = 'escalated'
    updatePayload.priority = 'high'
  } else if (action === 'under_review') {
    updatePayload.status = 'under_review'
    updatePayload.assigned_to = user.id
  } else if (action === 'assign') {
    if (!assigned_to) return NextResponse.json({ error: 'assigned_to required' }, { status: 400 })
    updatePayload.assigned_to = assigned_to
    if (report.status === 'open') updatePayload.status = 'under_review'
  } else if (action === 'set_priority') {
    const valid = ['low', 'normal', 'high', 'urgent']
    if (!valid.includes(priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    updatePayload.priority = priority
    activityDetail = priority
  } else if (action === 'suspend_listing') {
    if (report.target_type !== 'listing') {
      return NextResponse.json({ error: 'suspend_listing only valid for listing reports' }, { status: 400 })
    }
    const suspensionReason = resolution_note?.trim() || `Suspended due to user report (report #${id.slice(0, 8)})`

    // Fetch listing to get host ownership
    const { data: listing } = await adminClient
      .from('listings')
      .select('id, host_id, title')
      .eq('id', report.target_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const { error: suspendErr } = await adminClient
      .from('listings')
      .update({
        suspended_at:      now,
        suspension_reason: suspensionReason,
        is_active:         false,
        status:            'suspended',
      })
      .eq('id', report.target_id)

    if (suspendErr) return NextResponse.json({ error: suspendErr.message }, { status: 500 })

    // Keep report under_review — it will resurface when the host submits an explanation
    updatePayload.status = 'under_review'
    updatePayload.assigned_to = user.id
    activityDetail = suspensionReason

    // Notify host
    await notifyHost({
      hostUserId: listing.host_id,
      listingId:  listing.id,
      type:       'suspension',
      subject:    `Your listing has been suspended`,
      body:       `Your listing "${listing.title}" has been suspended.\n\nReason: ${suspensionReason}\n\nIf you believe this is an error, you may submit an explanation from your host dashboard.`,
    })

    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'listing.suspend', targetType: 'listing', targetId: report.target_id,
      beforeData: { id: report.target_id }, afterData: { suspended_at: now, status: 'suspended' },
      ipAddress: ip, userAgent: ua,
    })
  } else if (action === 'reactivate_listing') {
    if (report.target_type !== 'listing') {
      return NextResponse.json({ error: 'reactivate_listing only valid for listing reports' }, { status: 400 })
    }

    const { data: listing } = await adminClient
      .from('listings')
      .select('id, host_id, title')
      .eq('id', report.target_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const { error: reactivateErr } = await adminClient
      .from('listings')
      .update({
        suspended_at:        null,
        suspension_reason:   null,
        host_explanation:    null,
        host_explanation_at: null,
        is_active:           true,
        status:              'approved',
      })
      .eq('id', report.target_id)

    if (reactivateErr) return NextResponse.json({ error: reactivateErr.message }, { status: 500 })

    activityDetail = resolution_note || null

    await notifyHost({
      hostUserId: listing.host_id,
      listingId:  listing.id,
      type:       'reactivation',
      subject:    `Your listing has been reactivated`,
      body:       `Good news! Your listing "${listing.title}" has been reviewed and reactivated. You can go live again from your host dashboard.${resolution_note ? `\n\nAdmin note: ${resolution_note}` : ''}`,
    })

    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'listing.reactivate', targetType: 'listing', targetId: report.target_id,
      beforeData: { id: report.target_id }, afterData: { status: 'approved', is_active: true },
      ipAddress: ip, userAgent: ua,
    })
  } else if (action === 'reject_permanently') {
    if (report.target_type !== 'listing') {
      return NextResponse.json({ error: 'reject_permanently only valid for listing reports' }, { status: 400 })
    }

    const { data: listing } = await adminClient
      .from('listings')
      .select('id, host_id, title')
      .eq('id', report.target_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const rejectionReason = resolution_note?.trim() || 'Listing permanently removed following policy review.'

    const { error: rejectErr } = await adminClient
      .from('listings')
      .update({
        is_active: false,
        status:    'rejected',
      })
      .eq('id', report.target_id)

    if (rejectErr) return NextResponse.json({ error: rejectErr.message }, { status: 500 })

    updatePayload.status = 'resolved'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = `Listing permanently rejected. ${resolution_note ?? ''}`.trim()
    activityDetail = rejectionReason

    await notifyHost({
      hostUserId: listing.host_id,
      listingId:  listing.id,
      type:       'rejection',
      subject:    `Your listing has been permanently removed`,
      body:       `We're sorry, but your listing "${listing.title}" has been permanently removed from SnapReserve™ following a policy review.\n\nReason: ${rejectionReason}\n\nPlease contact support if you have questions.`,
    })

    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'listing.reject_permanently', targetType: 'listing', targetId: report.target_id,
      beforeData: { id: report.target_id }, afterData: { status: 'rejected', is_active: false },
      ipAddress: ip, userAgent: ua,
    })
  } else if (action === 'reopen') {
    updatePayload.status = 'open'
    updatePayload.resolved_by = null
    updatePayload.resolved_at = null
    activityDetail = 'Reopened by admin'
  } else if (action === 'go_live_listing') {
    if (report.target_type !== 'listing') {
      return NextResponse.json({ error: 'go_live_listing only valid for listing reports' }, { status: 400 })
    }

    const { data: listing } = await adminClient
      .from('listings')
      .select('id, host_id, title')
      .eq('id', report.target_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const { error: liveErr } = await adminClient
      .from('listings')
      .update({ is_active: true, status: 'live' })
      .eq('id', report.target_id)

    if (liveErr) return NextResponse.json({ error: liveErr.message }, { status: 500 })

    updatePayload.status = 'resolved'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = (`Listing approved and set live. ${resolution_note ?? ''}`).trim()
    activityDetail = resolution_note || 'Listing set to live'

    await notifyHost({
      hostUserId: listing.host_id,
      listingId:  listing.id,
      type:       'reactivation',
      subject:    `Your listing is now live`,
      body:       `Great news! Your listing "${listing.title}" has been reviewed and is now live on SnapReserve™.${resolution_note ? `\n\nAdmin note: ${resolution_note}` : ''}`,
    })

    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'listing.go_live', targetType: 'listing', targetId: report.target_id,
      beforeData: { id: report.target_id }, afterData: { status: 'live', is_active: true },
      ipAddress: ip, userAgent: ua,
    })
  }

  const { error: updateError } = await adminClient.from('reports').update(updatePayload).eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Append to activity timeline
  await adminClient.from('report_activity').insert({
    report_id:   id,
    actor_id:    user.id,
    actor_email: user.email,
    action,
    detail:      activityDetail,
  })

  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: `report.${action}`,
    targetType: 'report', targetId: id,
    beforeData: report, afterData: { ...report, ...updatePayload },
    ipAddress: ip, userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
