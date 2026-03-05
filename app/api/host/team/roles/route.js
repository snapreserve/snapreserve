import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

const VALID_PERMS = ['bookings','properties','calendar','messages','earnings','payouts','activity','reviews']

async function getHostId(admin, userId) {
  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', userId).maybeSingle()
  return hostRow?.id || null
}

// GET /api/host/team/roles — list custom roles for the caller's org
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const hostId = await getHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'No host organisation found' }, { status: 404 })

  const { data: roles, error } = await admin
    .from('host_custom_roles')
    .select('id, name, permissions, created_at')
    .eq('host_id', hostId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ roles: roles || [] })
}

// POST /api/host/team/roles — create a custom role (owner only)
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, permissions } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
  if (name.trim().length > 40) return NextResponse.json({ error: 'Role name must be 40 chars or less' }, { status: 400 })
  if (!Array.isArray(permissions)) return NextResponse.json({ error: 'permissions must be an array' }, { status: 400 })

  const cleanedPerms = permissions.filter(p => VALID_PERMS.includes(p))

  const admin = createAdminClient()
  const hostId = await getHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Only the organisation owner can create roles' }, { status: 403 })

  const { data: role, error } = await admin
    .from('host_custom_roles')
    .insert({ host_id: hostId, name: name.trim(), permissions: cleanedPerms, created_by: user.id })
    .select('id, name, permissions, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ role }, { status: 201 })
}
