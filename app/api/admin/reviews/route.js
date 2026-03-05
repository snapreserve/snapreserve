import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/admin/reviews?filter=all|visible|hidden&search=&page=1&limit=25
export async function GET(request) {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (error === 'mfa_required')    return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'all'
  const search = (searchParams.get('search') || '').trim()
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1',  10))
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '25', 10))
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  let q = admin
    .from('reviews')
    .select(
      'id, listing_id, booking_id, guest_id, rating, cleanliness, accuracy, communication, location, value, comment, host_reply, is_hidden, created_at, listings(title, city)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (filter === 'visible') q = q.eq('is_hidden', false)
  if (filter === 'hidden')  q = q.eq('is_hidden', true)

  q = q.range(offset, offset + limit - 1)

  const { data: rows, count, error: qError } = await q
  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 })

  // Enrich with guest names
  const guestIds = [...new Set((rows || []).map(r => r.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', guestIds)
    : { data: [] }

  const guestMap = Object.fromEntries((guests || []).map(g => [g.id, g]))

  let reviews = (rows || []).map(r => {
    const g = guestMap[r.guest_id] || {}
    const parts = (g.full_name || '').trim().split(/\s+/)
    const guestName = parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0] || g.email || 'Guest'
    return {
      id:            r.id,
      listing_id:    r.listing_id,
      listing_title: r.listings?.title || '—',
      listing_city:  r.listings?.city  || '',
      booking_id:    r.booking_id,
      guest_id:      r.guest_id,
      guest_name:    guestName,
      rating:        Number(r.rating),
      cleanliness:   r.cleanliness,
      accuracy:      r.accuracy,
      communication: r.communication,
      location:      r.location,
      value:         r.value,
      comment:       r.comment,
      host_reply:    r.host_reply,
      is_hidden:     r.is_hidden,
      created_at:    r.created_at,
    }
  })

  // Client-side search filter (listing title or guest name)
  if (search) {
    const lc = search.toLowerCase()
    reviews = reviews.filter(r =>
      r.listing_title.toLowerCase().includes(lc) ||
      r.listing_city.toLowerCase().includes(lc)  ||
      r.guest_name.toLowerCase().includes(lc)    ||
      (r.comment || '').toLowerCase().includes(lc)
    )
  }

  return NextResponse.json({ reviews, total: count ?? 0, page, limit })
}
