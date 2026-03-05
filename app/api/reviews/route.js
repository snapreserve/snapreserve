import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/reviews?listing_id=&limit=20&offset=0
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing_id')
  const limit     = Math.min(50, parseInt(searchParams.get('limit')  || '20', 10))
  const offset    = Math.max(0,  parseInt(searchParams.get('offset') || '0',  10))

  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: reviews, count, error } = await admin
    .from('reviews')
    .select('id, booking_id, guest_id, rating, cleanliness, accuracy, communication, location, value, comment, host_reply, created_at', { count: 'exact' })
    .eq('listing_id', listingId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch guest names (first name + last initial only)
  const guestIds = [...new Set((reviews || []).map(r => r.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name').in('id', guestIds)
    : { data: [] }

  const guestMap = Object.fromEntries((guests || []).map(g => {
    const parts = (g.full_name || '').trim().split(/\s+/)
    const display = parts.length > 1
      ? `${parts[0]} ${parts[parts.length - 1][0]}.`
      : parts[0] || 'Guest'
    return [g.id, display]
  }))

  const rows = (reviews || []).map(r => ({
    id:            r.id,
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

  return NextResponse.json({ reviews: rows, total: count ?? 0, limit, offset })
}

// POST /api/reviews
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { booking_id, rating, cleanliness, accuracy, communication, location, value, comment } = body

  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })

  const cats = { cleanliness, accuracy, communication, location, value }
  for (const [k, v] of Object.entries(cats)) {
    if (v !== undefined && v !== null && (v < 1 || v > 5)) {
      return NextResponse.json({ error: `${k} must be 1–5` }, { status: 400 })
    }
  }

  const admin = createAdminClient()

  // Verify booking belongs to this guest and is completed
  const { data: booking } = await admin
    .from('bookings')
    .select('id, listing_id, host_id, guest_id, status')
    .eq('id', booking_id)
    .eq('guest_id', user.id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'completed') return NextResponse.json({ error: 'Reviews can only be submitted for completed stays' }, { status: 400 })

  // Check for duplicate review
  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'You have already reviewed this booking' }, { status: 409 })

  // Resolve host_user_id from hosts table
  const { data: hostRow } = await admin
    .from('hosts')
    .select('user_id')
    .eq('id', booking.host_id)
    .maybeSingle()

  const { data: review, error: insertError } = await admin
    .from('reviews')
    .insert({
      listing_id:    booking.listing_id,
      booking_id,
      guest_id:      user.id,
      host_id:       hostRow?.user_id || null,
      rating:        Number(rating),
      cleanliness:   cleanliness   || null,
      accuracy:      accuracy      || null,
      communication: communication || null,
      location:      location      || null,
      value:         value         || null,
      comment:       comment?.trim() || null,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Update listing aggregate rating + review_count
  const { data: allReviews } = await admin
    .from('reviews')
    .select('rating')
    .eq('listing_id', booking.listing_id)
    .eq('is_hidden', false)

  const ratings = (allReviews || []).map(r => Number(r.rating)).filter(Boolean)
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0

  await admin
    .from('listings')
    .update({ rating: avgRating, review_count: ratings.length })
    .eq('id', booking.listing_id)

  return NextResponse.json({ review }, { status: 201 })
}
