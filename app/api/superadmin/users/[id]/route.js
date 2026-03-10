import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

export async function DELETE(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const hard = searchParams.get('hard') === 'true'

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: targetUser } = await adminClient
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // ── Server-side super_admin protection ──────────────────────────────────
  // Check BEFORE hitting the DB so we can log the attempt cleanly.
  const { data: isSuperAdmin } = await adminClient
    .from('admin_roles')
    .select('role')
    .eq('user_id', id)
    .eq('role', 'super_admin')
    .eq('is_active', true)
    .maybeSingle()

  if (isSuperAdmin) {
    await logAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      action: 'user.delete_blocked_super_admin',
      targetType: 'user',
      targetId: id,
      beforeData: { email: targetUser.email, reason: 'Super Admin accounts cannot be deleted' },
      afterData: null,
      ipAddress: ip,
      userAgent: ua,
    })
    return NextResponse.json(
      { error: 'The Super Admin account cannot be deleted' },
      { status: 403 }
    )
  }
  // ────────────────────────────────────────────────────────────────────────

  const now = new Date().toISOString()

  if (hard) {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }
    await adminClient.from('users').delete().eq('id', id)
  } else {
    const { error: softDeleteError } = await adminClient
      .from('users')
      .update({ deleted_at: now })
      .eq('id', id)

    if (softDeleteError) {
      return NextResponse.json({ error: softDeleteError.message }, { status: 500 })
    }

    // If user is a host, deactivate their listings so they no longer appear bookable
    const { data: hostRow } = await adminClient
      .from('hosts')
      .select('id')
      .eq('user_id', id)
      .maybeSingle()
    if (hostRow) {
      await adminClient
        .from('listings')
        .update({ is_active: false, status: 'suspended' })
        .eq('host_id', hostRow.id)
        .neq('status', 'deleted')
      await adminClient
        .from('hosts')
        .update({ suspended_at: now, suspension_reason: 'account_deleted' })
        .eq('id', hostRow.id)
    }
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: hard ? 'user.hard_deleted' : 'user.soft_deleted',
    targetType: 'user',
    targetId: id,
    beforeData: targetUser,
    afterData: null,
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
