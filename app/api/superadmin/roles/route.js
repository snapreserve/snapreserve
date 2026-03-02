import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { target_user_id, role: grantRole } = body

  if (!target_user_id || !grantRole) {
    return NextResponse.json({ error: 'target_user_id and role required' }, { status: 400 })
  }

  const validRoles = ['super_admin', 'admin', 'support', 'finance', 'trust_safety']
  if (!validRoles.includes(grantRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Enforce super_admin email allowlist at API layer
  if (grantRole === 'super_admin') {
    const allowed = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(target_user_id)
    if (!targetUser || !allowed.includes(targetUser.email?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Email is not in the super_admin allowlist' },
        { status: 403 }
      )
    }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const { error: upsertError } = await adminClient
    .from('admin_roles')
    .upsert(
      { user_id: target_user_id, role: grantRole, granted_by: user.id, is_active: true },
      { onConflict: 'user_id,role' }
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'role.granted',
    targetType: 'role',
    targetId: target_user_id,
    beforeData: null,
    afterData: { role: grantRole, target_user_id },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { target_user_id, role: revokeRole } = body

  if (!target_user_id || !revokeRole) {
    return NextResponse.json({ error: 'target_user_id and role required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient
    .from('admin_roles')
    .update({ is_active: false })
    .eq('user_id', target_user_id)
    .eq('role', revokeRole)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'role.revoked',
    targetType: 'role',
    targetId: target_user_id,
    beforeData: { role: revokeRole, target_user_id },
    afterData: null,
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
