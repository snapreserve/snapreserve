import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action, resolution_note, assigned_to, priority } = body

  const validActions = ['resolve', 'dismiss', 'escalate', 'under_review', 'assign', 'set_priority', 'suspend_listing']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
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

  if (action === 'resolve') {
    updatePayload.status = 'resolved'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = resolution_note ?? null
  } else if (action === 'dismiss') {
    updatePayload.status = 'dismissed'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = resolution_note ?? null
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
  } else if (action === 'suspend_listing') {
    // Only valid for listing reports
    if (report.target_type !== 'listing') {
      return NextResponse.json({ error: 'suspend_listing only valid for listing reports' }, { status: 400 })
    }
    // Suspend the listing
    const { error: suspendErr } = await adminClient
      .from('listings')
      .update({
        suspended_at:       now,
        suspension_reason:  `Suspended due to user report (report #${id.slice(0, 8)})`,
        is_active:          false,
      })
      .eq('id', report.target_id)

    if (suspendErr) return NextResponse.json({ error: suspendErr.message }, { status: 500 })

    // Also resolve the report
    updatePayload.status = 'resolved'
    updatePayload.resolved_by = user.id
    updatePayload.resolved_at = now
    updatePayload.resolution_note = `Listing suspended. ${resolution_note ?? ''}`.trim()

    // Log listing suspension separately
    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'listing.suspend', targetType: 'listing', targetId: report.target_id,
      beforeData: { id: report.target_id }, afterData: { suspended_at: now },
      ipAddress: ip, userAgent: ua,
    })
  }

  const { error: updateError } = await adminClient.from('reports').update(updatePayload).eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: `report.${action}`,
    targetType: 'report', targetId: id,
    beforeData: report, afterData: { ...report, ...updatePayload },
    ipAddress: ip, userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
