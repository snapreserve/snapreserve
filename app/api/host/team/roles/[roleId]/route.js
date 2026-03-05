import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

const VALID_PERMS = ['bookings','properties','calendar','messages','earnings','payouts','activity','reviews']

async function getHostId(admin, userId) {
  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', userId).maybeSingle()
  return hostRow?.id || null
}

// PATCH /api/host/team/roles/[roleId] — update name and/or permissions (owner only)
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roleId } = await params
  const body = await request.json().catch(() => ({}))
  const { name, permissions } = body

  const admin = createAdminClient()
  const hostId = await getHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Only the organisation owner can update roles' }, { status: 403 })

  // Verify the role belongs to this org
  const { data: existing } = await admin
    .from('host_custom_roles')
    .select('id, host_id')
    .eq('id', roleId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (existing.host_id !== hostId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates = {}
  if (name !== undefined) {
    if (!name?.trim()) return NextResponse.json({ error: 'Role name cannot be empty' }, { status: 400 })
    if (name.trim().length > 40) return NextResponse.json({ error: 'Role name must be 40 chars or less' }, { status: 400 })
    updates.name = name.trim()
  }
  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) return NextResponse.json({ error: 'permissions must be an array' }, { status: 400 })
    updates.permissions = permissions.filter(p => VALID_PERMS.includes(p))
  }

  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data: role, error } = await admin
    .from('host_custom_roles')
    .update(updates)
    .eq('id', roleId)
    .select('id, name, permissions, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ role })
}

// DELETE /api/host/team/roles/[roleId] — delete custom role (owner only)
// Members with this custom_role_id are reset to role='staff', custom_role_id=null
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roleId } = await params
  const admin = createAdminClient()
  const hostId = await getHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Only the organisation owner can delete roles' }, { status: 403 })

  const { data: existing } = await admin
    .from('host_custom_roles')
    .select('id, host_id')
    .eq('id', roleId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (existing.host_id !== hostId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Reset members using this role to staff
  await admin
    .from('host_team_members')
    .update({ role: 'staff', custom_role_id: null })
    .eq('custom_role_id', roleId)

  const { error } = await admin.from('host_custom_roles').delete().eq('id', roleId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
