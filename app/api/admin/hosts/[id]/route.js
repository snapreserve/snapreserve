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

  // Only admin and super_admin can manage hosts
  const ALLOWED_ROLES = ['admin', 'super_admin']
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, reason } = body

  const validActions = ['verify', 'suspend', 'reactivate']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'suspend' && !reason?.trim()) {
    return NextResponse.json({ error: 'reason required for suspend' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: host } = await adminClient
    .from('hosts')
    .select('*')
    .eq('id', id)
    .single()

  if (!host) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  let hostUpdate = {}
  let userUpdate = {}

  if (action === 'verify') {
    hostUpdate.verification_status = 'verified'
  } else if (action === 'suspend') {
    hostUpdate.suspended_at = now
    hostUpdate.suspension_reason = reason
    userUpdate.suspended_at = now
    userUpdate.suspension_reason = reason
  } else if (action === 'reactivate') {
    hostUpdate.suspended_at = null
    hostUpdate.suspension_reason = null
    userUpdate.suspended_at = null
    userUpdate.suspension_reason = null
  }

  const { error: hostUpdateError } = await adminClient
    .from('hosts')
    .update(hostUpdate)
    .eq('id', id)

  if (hostUpdateError) {
    return NextResponse.json({ error: hostUpdateError.message }, { status: 500 })
  }

  // Also update the users table if suspending/reactivating
  if (Object.keys(userUpdate).length > 0) {
    await adminClient
      .from('users')
      .update(userUpdate)
      .eq('id', host.user_id)
  }

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     `host.${action}`,
    targetType: 'host',
    targetId:   id,
    beforeData: host,
    afterData:  { ...host, ...hostUpdate },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true })
}
