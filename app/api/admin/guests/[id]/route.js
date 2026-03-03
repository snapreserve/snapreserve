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

  // Only admin and super_admin can manage guests
  const ALLOWED_ROLES = ['admin', 'super_admin']
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, reason } = body

  const validActions = ['suspend', 'deactivate', 'reactivate']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if ((action === 'suspend' || action === 'deactivate') && !reason?.trim()) {
    return NextResponse.json({ error: 'reason required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: guest } = await adminClient
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!guest) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  let updatePayload = {}

  if (action === 'suspend') {
    updatePayload.suspended_at = now
    updatePayload.suspension_reason = reason
    updatePayload.is_active = false
  } else if (action === 'deactivate') {
    updatePayload.deleted_at = now
    updatePayload.deletion_reason = reason
    updatePayload.is_active = false
  } else if (action === 'reactivate') {
    updatePayload.suspended_at = null
    updatePayload.suspension_reason = null
    updatePayload.deleted_at = null
    updatePayload.deletion_reason = null
    updatePayload.is_active = true
  }

  const { error: updateError } = await adminClient
    .from('users')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     `guest.${action}`,
    targetType: 'user',
    targetId:   id,
    beforeData: guest,
    afterData:  { ...guest, ...updatePayload },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true })
}
