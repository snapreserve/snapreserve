import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { notifyUser } from '@/lib/notify-user'

const REINSTATE_ROLES = ['super_admin', 'trust_safety']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!REINSTATE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Only Trust & Safety or Super Admin can respond to appeals.' },
      { status: 403 }
    )
  }

  const { id } = await params
  const body = await request.json()
  const { action, admin_response } = body // action: 'approve' | 'reject' | 'under_review'

  if (!['approve', 'reject', 'under_review'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if ((action === 'approve' || action === 'reject') && !admin_response?.trim()) {
    return NextResponse.json({ error: 'admin_response required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  const { data: appeal } = await admin
    .from('appeals')
    .select('*')
    .eq('id', id)
    .single()

  if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })

  const now = new Date().toISOString()
  const statusMap = { approve: 'approved', reject: 'rejected', under_review: 'under_review' }

  await admin.from('appeals').update({
    status:         statusMap[action],
    admin_response: admin_response?.trim() ?? null,
    reviewed_by:    user.id,
    reviewed_at:    now,
  }).eq('id', id)

  // If approved, reinstate the user
  if (action === 'approve') {
    await admin.from('users').update({
      suspended_at:        null,
      suspension_reason:   null,
      suspension_category: null,
      admin_notes:         null,
      deleted_at:          null,
      deletion_reason:     null,
      is_active:           true,
    }).eq('id', appeal.user_id)

    // Re-enable host too if applicable
    const { data: hostRow } = await admin
      .from('hosts').select('id').eq('user_id', appeal.user_id).maybeSingle()
    if (hostRow) {
      await admin.from('hosts').update({
        suspended_at: null, suspension_reason: null, suspension_category: null, admin_notes: null,
      }).eq('id', hostRow.id)
      await admin.from('listings')
        .update({ is_active: true, status: 'approved' })
        .eq('host_id', hostRow.id)
        .eq('status', 'suspended')
    }

    await notifyUser({
      userId:  appeal.user_id,
      type:    'reactivation',
      subject: 'Your appeal has been approved',
      body:    `Great news! Your SnapReserve™ account appeal has been approved and your account has been reinstated.\n\n${admin_response?.trim() ?? ''}\n\nWelcome back.`,
    })
  } else if (action === 'reject') {
    await notifyUser({
      userId:  appeal.user_id,
      type:    'rejection',
      subject: 'Your appeal has been reviewed',
      body:    `Your SnapReserve™ account appeal has been reviewed.\n\n${admin_response?.trim()}\n\nFor further assistance, contact support@snapreserve.app.`,
    })
  } else {
    await notifyUser({
      userId:  appeal.user_id,
      type:    'info',
      subject: 'Your appeal is under review',
      body:    'Your appeal is currently being reviewed by our team. We will get back to you shortly.',
    })
  }

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     `appeal.${action}`,
    targetType: 'appeal',
    targetId:   id,
    beforeData: appeal,
    afterData:  { ...appeal, status: statusMap[action] },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true })
}
