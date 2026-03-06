import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/host/rooms?listing_id=XXX — list rooms for a listing
export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the calling user is the host owner of this listing
  const hostUserId = await resolveHostUserId(admin, user.id)
  if (!hostUserId) return NextResponse.json({ error: 'No host found' }, { status: 403 })

  const { data: listing } = await admin
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('host_id', (await admin.from('hosts').select('id').eq('user_id', hostUserId).maybeSingle()).data?.id)
    .maybeSingle()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const { data: rooms, error } = await admin
    .from('rooms')
    .select('*')
    .eq('listing_id', listingId)
    .order('price_per_night', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rooms })
}

// POST /api/host/rooms — create a new room
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { listing_id, name, tier, price_per_night, max_guests, bed_type, view_type, amenities, units_available } = body

  if (!listing_id || !name || !price_per_night) {
    return NextResponse.json({ error: 'listing_id, name, and price_per_night are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const hostUserId = await resolveHostUserId(admin, user.id)
  if (!hostUserId) return NextResponse.json({ error: 'No host found' }, { status: 403 })

  // Verify listing belongs to host
  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', hostUserId).maybeSingle()
  const { data: listing } = await admin.from('listings').select('id').eq('id', listing_id).eq('host_id', hostRow?.id).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const { data: room, error } = await admin.from('rooms').insert({
    listing_id,
    name,
    tier:            tier || 'Standard',
    price_per_night: parseFloat(price_per_night),
    max_guests:      parseInt(max_guests) || 2,
    bed_type:        bed_type || null,
    view_type:       view_type || null,
    amenities:       amenities || null,
    units_available: parseInt(units_available) || 1,
    is_available:    true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ room })
}

// Helper
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
