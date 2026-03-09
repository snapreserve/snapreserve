import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/availability?listing_id=XXX
 * Returns booked date ranges for a listing so the UI can display unavailable dates.
 * Only returns future/current bookings (check_out > today).
 */
export async function GET(request) {
  // Rate limit: 60 requests per IP per minute (prevents enumeration abuse)
  const ip = getClientIp(request)
  const rl = rateLimit(`availability:${ip}`, 60, 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')

  if (!listing_id) {
    return Response.json({ error: 'listing_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

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

  // Merge blocked date ranges (using same shape as bookings: check_in/check_out)
  const blockedRanges = (blockedDates || []).map(b => ({
    check_in: b.start_date,
    check_out: b.end_date,
    blocked: true,
  }))

  return Response.json({ booked: [...(bookings || []), ...blockedRanges] })
}
