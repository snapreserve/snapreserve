import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/host/reviews?listing_id=&page=1
export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingIdFilter = searchParams.get('listing_id') || null
  const page  = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = 20
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  // Resolve host's org user_id (direct host or team member)
  let ownerHostId = null  // hosts.id

  const { data: directHost } = await admin
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (directHost) {
    ownerHostId = directHost.id
  } else {
    const { data: membership } = await admin
      .from('host_team_members')
      .select('host_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (membership) ownerHostId = membership.host_id
  }

  if (!ownerHostId) return NextResponse.json({ error: 'No host organisation found' }, { status: 404 })

  // Get all listing IDs for this host
  let listingsQ = admin.from('listings').select('id, title').eq('host_id', ownerHostId).is('deleted_at', null)
  const { data: hostListings } = await listingsQ

  const listingIds = (hostListings || []).map(l => l.id)
  if (listingIds.length === 0) return NextResponse.json({ reviews: [], total: 0, page, limit, metrics: { avg_rating: 0, total_reviews: 0, rating_breakdown: {} }, listings: [] })

  const listingMap = Object.fromEntries((hostListings || []).map(l => [l.id, l.title]))

  // Fetch reviews
  let q = admin
    .from('reviews')
    .select('id, listing_id, booking_id, guest_id, rating, cleanliness, accuracy, communication, location, value, comment, host_reply, created_at', { count: 'exact' })
    .in('listing_id', listingIds)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })

  if (listingIdFilter) q = q.eq('listing_id', listingIdFilter)
  q = q.range(offset, offset + limit - 1)

  const { data: rows, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask guest names
  const guestIds = [...new Set((rows || []).map(r => r.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name').in('id', guestIds)
    : { data: [] }

  const guestMap = Object.fromEntries((guests || []).map(g => {
    const parts = (g.full_name || '').trim().split(/\s+/)
    const display = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || 'Guest'
    return [g.id, display]
  }))

  const reviews = (rows || []).map(r => ({
    id:            r.id,
    listing_id:    r.listing_id,
    listing_title: listingMap[r.listing_id] || '—',
    booking_id:    r.booking_id,
    guest_name:    guestMap[r.guest_id] || 'Guest',
    rating:        Number(r.rating),
    cleanliness:   r.cleanliness,
    accuracy:      r.accuracy,
    communication: r.communication,
    location:      r.location,
    value:         r.value,
    comment:       r.comment,
    host_reply:    r.host_reply,
    created_at:    r.created_at,
  }))

  // Aggregate metrics across ALL reviews (not just this page)
  const { data: allRatings } = await admin
    .from('reviews')
    .select('rating')
    .in('listing_id', listingIdFilter ? [listingIdFilter] : listingIds)
    .eq('is_hidden', false)

  const ratingValues = (allRatings || []).map(r => Number(r.rating))
  const avg_rating = ratingValues.length > 0
    ? Math.round((ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length) * 10) / 10
    : 0

  // Rating breakdown 1-5
  const rating_breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  ratingValues.forEach(v => {
    const bucket = Math.round(v)
    if (bucket >= 1 && bucket <= 5) rating_breakdown[bucket]++
  })

  return NextResponse.json({
    reviews,
    total: count ?? 0,
    page,
    limit,
    metrics: { avg_rating, total_reviews: ratingValues.length, rating_breakdown },
    listings: hostListings || [],
  })
}

// PATCH /api/host/reviews — host reply to a review
export async function PATCH(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { review_id, reply } = body
  if (!review_id) return NextResponse.json({ error: 'review_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify review is for one of this host's listings
  const { data: review } = await admin.from('reviews').select('id, listing_id').eq('id', review_id).maybeSingle()
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  // Verify host owns this listing
  const { data: listing } = await admin.from('listings').select('host_id').eq('id', review.listing_id).maybeSingle()
  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', user.id).maybeSingle()

  let authorised = hostRow && listing?.host_id === hostRow.id
  if (!authorised) {
    // Check team member
    const { data: mem } = await admin.from('host_team_members').select('host_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    authorised = mem && listing?.host_id === mem.host_id
  }
  if (!authorised) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: updateErr } = await admin
    .from('reviews')
    .update({ host_reply: reply?.trim() || null })
    .eq('id', review_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
