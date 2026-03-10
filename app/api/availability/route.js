import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/availability?listing_id=XXX
 *   Returns booked date ranges for a single listing (for the booking sidebar calendar).
 *
 * GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
 *   Returns { unavailable_listing_ids: [...] } — listing IDs that have an overlapping
 *   booking or host-blocked period, so the search page can exclude them.
 *
 * Overlap rule: existing_check_in < requested_check_out AND existing_check_out > requested_check_in
 */
export async function GET(request) {
  // Rate limit: 60 requests per IP per minute
  const ip = getClientIp(request)
  const rl = rateLimit(`availability:${ip}`, 60, 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')
  const check_in   = searchParams.get('check_in')
  const check_out  = searchParams.get('check_out')

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  // ── BATCH MODE: check_in + check_out without listing_id ─────────────
  if (!listing_id && check_in && check_out) {
    if (check_out <= check_in) {
      return Response.json({ error: 'check_out must be after check_in' }, { status: 400 })
    }

    const [{ data: bookedRows }, { data: blockedRows }] = await Promise.all([
      // Bookings that overlap the requested date range
      admin
        .from('bookings')
        .select('listing_id')
        .not('status', 'in', '("cancelled","refunded","completed")')
        .lt('check_in', check_out)   // existing check_in < requested check_out
        .gt('check_out', check_in),  // existing check_out > requested check_in
      // Host-blocked dates that overlap the requested date range
      admin
        .from('listing_blocked_dates')
        .select('listing_id')
        .lt('start_date', check_out)
        .gt('end_date', check_in),
    ])

    const unavailableIds = new Set([
      ...(bookedRows  || []).map(r => r.listing_id),
      ...(blockedRows || []).map(r => r.listing_id),
    ])

    return Response.json({ unavailable_listing_ids: [...unavailableIds] })
  }

  // ── SINGLE LISTING MODE: listing_id ─────────────────────────────────
  if (!listing_id) {
    return Response.json({ error: 'listing_id (or check_in + check_out) required' }, { status: 400 })
  }

  const [{ data: bookings, error }, { data: blockedDates }] = await Promise.all([
    admin
      .from('bookings')
      .select('check_in, check_out')
      .eq('listing_id', listing_id)
      .not('status', 'in', '("cancelled","refunded")')
      .gt('check_out', today),
    admin
      .from('listing_blocked_dates')
      .select('start_date, end_date')
      .eq('listing_id', listing_id)
      .gte('end_date', today),
  ])

  if (error) {
    console.error('Availability fetch error:', error)
    return Response.json({ error: 'Failed to fetch availability.' }, { status: 500 })
  }

  const blockedRanges = (blockedDates || []).map(b => ({
    check_in: b.start_date,
    check_out: b.end_date,
    blocked: true,
  }))

  return Response.json({ booked: [...(bookings || []), ...blockedRanges] })
}
