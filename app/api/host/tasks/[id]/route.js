import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

async function resolveHostId(admin, userId) {
  const { data: hostRow } = await admin
    .from('hosts').select('id').eq('user_id', userId).maybeSingle()
  if (hostRow) return hostRow.id

  const { data: mem } = await admin
    .from('host_team_members')
    .select('host_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return mem?.host_id || null
}

// PATCH /api/host/tasks/[id]
// Body: { title?, status?, due_date?, listing_id? }
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const admin  = createAdminClient()
  const hostId = await resolveHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  // Verify task belongs to this host
  const { data: existing } = await admin
    .from('host_tasks')
    .select('id, host_id')
    .eq('id', id)
    .eq('host_id', hostId)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const updates = {}
  if (body.title       !== undefined) updates.title       = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to || null
  if (body.status !== undefined) {
    if (!['urgent', 'in_progress', 'scheduled', 'done'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updates.status = body.status
  }
  if (body.due_date !== undefined) updates.due_date  = body.due_date || null
  if (body.listing_id !== undefined) {
    // Verify listing belongs to this host
    const { data: listing } = await admin
      .from('listings')
      .select('id')
      .eq('id', body.listing_id)
      .eq('host_id', hostId)
      .maybeSingle()
    if (!listing) return NextResponse.json({ error: 'Listing not found or not yours' }, { status: 404 })
    updates.listing_id = body.listing_id
  }
  updates.updated_at = new Date().toISOString()

  const { error } = await admin
    .from('host_tasks')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/host/tasks/[id]
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin  = createAdminClient()
  const hostId = await resolveHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  const { error } = await admin
    .from('host_tasks')
    .delete()
    .eq('id', id)
    .eq('host_id', hostId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
