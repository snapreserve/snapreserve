import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// PATCH /api/host/rooms/[id] — update room fields or toggle availability
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const hostUserId = await resolveHostUserId(admin, user.id)
  if (!hostUserId) return NextResponse.json({ error: 'No host found' }, { status: 403 })

  // Verify room belongs to host
  const { data: room } = await admin.from('rooms').select('listing_id').eq('id', id).maybeSingle()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', hostUserId).maybeSingle()
  const { data: listing } = await admin.from('listings').select('id').eq('id', room.listing_id).eq('host_id', hostRow?.id).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const allowed = ['name', 'tier', 'price_per_night', 'max_guests', 'bed_type', 'view_type', 'amenities', 'units_available', 'is_available']
  const update = {}
  for (const key of allowed) {
    if (key in body) {
      if (key === 'price_per_night') update[key] = parseFloat(body[key])
      else if (key === 'max_guests' || key === 'units_available') update[key] = parseInt(body[key])
      else update[key] = body[key]
    }
  }

  const { error } = await admin.from('rooms').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/host/rooms/[id] — remove a room
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const hostUserId = await resolveHostUserId(admin, user.id)
  if (!hostUserId) return NextResponse.json({ error: 'No host found' }, { status: 403 })

  const { data: room } = await admin.from('rooms').select('listing_id').eq('id', id).maybeSingle()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', hostUserId).maybeSingle()
  const { data: listing } = await admin.from('listings').select('id').eq('id', room.listing_id).eq('host_id', hostRow?.id).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { error } = await admin.from('rooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

async function resolveHostUserId(admin, userId) {
  const { data: directHost } = await admin.from('hosts').select('user_id').eq('user_id', userId).maybeSingle()
  if (directHost) return userId

  const { data: mem } = await admin.from('host_team_members').select('host_id').eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (mem) {
    const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
    return orgHost?.user_id ?? null
  }
  return null
}
