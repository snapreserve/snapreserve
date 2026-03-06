import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

// GET /api/superadmin/custom-roles — list all roles (system + custom)
export async function GET() {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: roles, error: dbErr } = await admin
    .from('admin_custom_roles')
    .select('*')
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ roles: roles || [] })
}

// POST /api/superadmin/custom-roles — create a custom role
export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { name, description, permissions, color } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!permissions || typeof permissions !== 'object') {
    return NextResponse.json({ error: 'Permissions object is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: newRole, error: dbErr } = await admin
    .from('admin_custom_roles')
    .insert({
      name:        name.trim().toLowerCase().replace(/\s+/g, '_'),
      description: description?.trim() || null,
      permissions,
      color:       color || '#6B7280',
      is_system:   false,
      created_by:  user.id,
    })
    .select('*')
    .single()

  if (dbErr) {
    if (dbErr.code === '23505') return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  const hdrs = await headers()
  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: 'role.created', targetType: 'admin_custom_role', targetId: newRole.id,
    afterData: newRole, ipAddress: hdrs.get('x-forwarded-for'), userAgent: hdrs.get('user-agent'),
  })

  return NextResponse.json({ success: true, role: newRole }, { status: 201 })
}
