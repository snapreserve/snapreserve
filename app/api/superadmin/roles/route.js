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

  // ── super_admin cannot be granted through any normal interface ───────────
  // It must be seeded directly in the DB by a postgres superuser/migration.
  const grantableRoles = ['admin', 'support', 'finance', 'trust_safety']
  if (!grantableRoles.includes(grantRole)) {
    const h = await headers()
    await logAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      action: 'role.grant_blocked_super_admin',
      targetType: 'role',
      targetId: target_user_id,
      beforeData: null,
      afterData: { attempted_role: grantRole },
      ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
      userAgent: h.get('user-agent') ?? 'unknown',
    })
    return NextResponse.json(
      { error: 'super_admin role cannot be assigned through this interface' },
      { status: 403 }
    )
  }
  // ─────────────────────────────────────────────────────────────────────────

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  // Verify the target user actually exists before granting any role
  const { data: targetUser } = await adminClient
    .from('users')
    .select('id, is_owner')
    .eq('id', target_user_id)
    .maybeSingle()

  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
  }

  // Owner account roles cannot be modified
  if (targetUser.is_owner) {
    return NextResponse.json({ error: 'This account is protected and cannot be modified.' }, { status: 403 })
  }

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

  const adminClientDel = createAdminClient()
  const { data: targetUserDel } = await adminClientDel
    .from('users').select('is_owner').eq('id', target_user_id).maybeSingle()
  if (targetUserDel?.is_owner) {
    return NextResponse.json({ error: 'This account is protected and cannot be modified.' }, { status: 403 })
  }

  // ── Block revocation of super_admin role ─────────────────────────────────
  if (revokeRole === 'super_admin') {
    await logAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      action: 'role.revoke_blocked_super_admin',
      targetType: 'role',
      targetId: target_user_id,
      beforeData: { role: 'super_admin', target_user_id },
      afterData: null,
      ipAddress: ip,
      userAgent: ua,
    })
    return NextResponse.json(
      { error: 'The Super Admin role cannot be revoked through this interface' },
      { status: 403 }
    )
  }
  // ─────────────────────────────────────────────────────────────────────────

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
