import { createAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/availability?listing_id=XXX
 * Returns booked date ranges for a listing so the UI can display unavailable dates.
 * Only returns future/current bookings (check_out > today).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')

  if (!listing_id) {
    return Response.json({ error: 'listing_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: bookings, error } = await admin
    .from('bookings')
    .select('check_in, check_out')
    .eq('listing_id', listing_id)
    .not('status', 'in', '("cancelled","refunded")')
    .gt('check_out', today)

  if (error) {
    console.error('Availability fetch error:', error)
    return Response.json({ error: 'Failed to fetch availability.' }, { status: 500 })
  }

  return Response.json({ booked: bookings || [] })
}
