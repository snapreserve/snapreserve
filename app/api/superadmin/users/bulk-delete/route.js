import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

/**
 * POST /api/superadmin/users/bulk-delete
 * Body: { userIds: string[] }
 * Soft-deletes multiple users. Super Admin only. Cannot delete other super_admins.
 */
export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds : []
  if (userIds.length === 0) {
    return NextResponse.json({ error: 'userIds array is required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  // Resolve which IDs are super_admin (cannot delete)
  const { data: adminRoles } = await adminClient
    .from('admin_roles')
    .select('user_id')
    .in('user_id', userIds)
    .eq('role', 'super_admin')
    .eq('is_active', true)
  const superAdminIds = new Set((adminRoles ?? []).map(r => r.user_id))

  const deleted = []
  const skipped = []
  const errors = []

  const now = new Date().toISOString()

  for (const id of userIds) {
    if (superAdminIds.has(id)) {
      skipped.push(id)
      continue
    }

    const { data: targetUser } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!targetUser) {
      errors.push(`User ${id.slice(0, 8)}… not found`)
      continue
    }

    const { error: updateError } = await adminClient
      .from('users')
      .update({ deleted_at: now })
      .eq('id', id)

    if (updateError) {
      errors.push(targetUser.email || id)
      continue
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

    deleted.push(id)
    await logAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      action: 'user.soft_deleted',
      targetType: 'user',
      targetId: id,
      beforeData: targetUser,
      afterData: null,
      ipAddress: ip,
      userAgent: ua,
    })
  }

  return NextResponse.json({
    success: true,
    deleted: deleted.length,
    deletedIds: deleted,
    skipped: skipped.length,
    errors: errors.length ? errors : undefined,
  })
}
