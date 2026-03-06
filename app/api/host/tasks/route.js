import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// Resolve the host_id for the current user (owner or team member)
async function resolveHostId(admin, userId) {
  const { data: hostRow } = await admin
    .from('hosts').select('id').eq('user_id', userId).maybeSingle()
  if (hostRow) return { hostId: hostRow.id, userId }

  const { data: mem } = await admin
    .from('host_team_members')
    .select('host_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return { hostId: mem?.host_id || null, userId }
}

// GET /api/host/tasks?listing_id=&status=
export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { hostId } = await resolveHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  const status    = searchParams.get('status')

  let query = admin
    .from('host_tasks')
    .select('id, listing_id, title, description, status, due_date, assigned_to, created_at, listings(id, title, city, state)')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })

  if (listingId) query = query.eq('listing_id', listingId)
  if (status)    query = query.eq('status', status)

  const { data: tasks, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten listing data for convenience
  const shaped = (tasks || []).map(t => ({
    id:             t.id,
    listing_id:     t.listing_id,
    listing_title:  t.listings?.title || 'Unknown property',
    listing_city:   t.listings?.city  || '',
    listing_state:  t.listings?.state || '',
    title:          t.title,
    description:    t.description    || '',
    status:         t.status,
    due_date:       t.due_date,
    assigned_to:    t.assigned_to,
    created_at:     t.created_at,
  }))

  return NextResponse.json({ tasks: shaped })
}

// POST /api/host/tasks
// Body: { title, listing_id, description?, due_date?, status?, assigned_to? }
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { title, listing_id, description, due_date, status = 'scheduled', assigned_to } = body

  if (!title?.trim())  return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
  if (!listing_id)     return NextResponse.json({ error: 'Property is required' }, { status: 400 })
  if (!['urgent', 'in_progress', 'scheduled', 'done'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { hostId } = await resolveHostId(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  // Verify the listing belongs to this host
  const { data: listing } = await admin
    .from('listings')
    .select('id, title, city, state')
    .eq('id', listing_id)
    .eq('host_id', hostId)
    .maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found or not yours' }, { status: 404 })

  const { data: task, error } = await admin
    .from('host_tasks')
    .insert({
      host_id:     hostId,
      listing_id,
      title:       title.trim(),
      description: description?.trim() || null,
      status,
      due_date:    due_date || null,
      assigned_to: assigned_to || null,
      created_by:  user.id,
    })
    .select('id, listing_id, title, description, status, due_date, assigned_to, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    task: {
      ...task,
      description:   task.description   || '',
      listing_title: listing.title,
      listing_city:  listing.city  || '',
      listing_state: listing.state || '',
    }
  }, { status: 201 })
}
