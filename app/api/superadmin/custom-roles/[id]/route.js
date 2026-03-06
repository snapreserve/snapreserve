import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

// PATCH /api/superadmin/custom-roles/[id]
export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('admin_custom_roles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (existing.is_system) return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const updates = {}
  if (body.name        !== undefined) updates.name        = body.name.trim().toLowerCase().replace(/\s+/g, '_')
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.permissions !== undefined) updates.permissions = body.permissions
  if (body.color       !== undefined) updates.color       = body.color

  const { data: updated, error: dbErr } = await admin
    .from('admin_custom_roles')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const hdrs = await headers()
  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: 'role.permissions_changed', targetType: 'admin_custom_role', targetId: params.id,
    beforeData: existing, afterData: updated,
    ipAddress: hdrs.get('x-forwarded-for'), userAgent: hdrs.get('user-agent'),
  })

  return NextResponse.json({ success: true, role: updated })
}

// DELETE /api/superadmin/custom-roles/[id]
export async function DELETE(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('admin_custom_roles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (existing.is_system) return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 })

  // Check if any admin_roles rows use this custom role
  const { count } = await admin
    .from('admin_roles')
    .select('id', { count: 'exact', head: true })
    .eq('custom_role_id', params.id)

  if ((count || 0) > 0) {
    return NextResponse.json({ error: `${count} admin(s) are assigned this role. Reassign them first.` }, { status: 409 })
  }

  await admin.from('admin_custom_roles').delete().eq('id', params.id)

  const hdrs = await headers()
  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: 'role.deleted', targetType: 'admin_custom_role', targetId: params.id,
    beforeData: existing, ipAddress: hdrs.get('x-forwarded-for'), userAgent: hdrs.get('user-agent'),
  })

  return NextResponse.json({ success: true })
}
