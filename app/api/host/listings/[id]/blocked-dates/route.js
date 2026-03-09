import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/host/listings/[id]/blocked-dates
 * Public — returns all blocked date ranges for a listing.
 */
export async function GET(request, { params }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('listing_blocked_dates')
    .select('id, start_date, end_date, reason, created_at')
    .eq('listing_id', id)
    .order('start_date', { ascending: true })

  if (error) return Response.json({ error: 'Failed to fetch blocked dates.' }, { status: 500 })
  return Response.json({ blocked_dates: data || [] })
}

/**
 * POST /api/host/listings/[id]/blocked-dates
 * Host adds a blocked date range: { start_date, end_date, reason? }
 */
export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { start_date, end_date, reason } = body

  if (!start_date || !end_date) {
    return Response.json({ error: 'start_date and end_date are required.' }, { status: 400 })
  }
  if (start_date > end_date) {
    return Response.json({ error: 'start_date must be before end_date.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify host owns this listing
  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', user.id).maybeSingle()
  if (!hostRow) return Response.json({ error: 'Host profile not found.' }, { status: 403 })

  const { data: listing } = await admin
    .from('listings').select('id').eq('id', id).eq('host_id', hostRow.id).maybeSingle()
  if (!listing) return Response.json({ error: 'Listing not found or not yours.' }, { status: 403 })

  const { data, error } = await admin.from('listing_blocked_dates').insert({
    listing_id: id,
    start_date,
    end_date,
    reason: reason || null,
  }).select().single()

  if (error) return Response.json({ error: 'Failed to add blocked dates.' }, { status: 500 })
  return Response.json({ blocked_date: data }, { status: 201 })
}

/**
 * DELETE /api/host/listings/[id]/blocked-dates
 * Host removes a blocked date range: { blocked_date_id }
 */
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { blocked_date_id } = body

  if (!blocked_date_id) {
    return Response.json({ error: 'blocked_date_id is required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify host owns this listing
  const { data: hostRow } = await admin.from('hosts').select('id').eq('user_id', user.id).maybeSingle()
  if (!hostRow) return Response.json({ error: 'Host profile not found.' }, { status: 403 })

  const { data: listing } = await admin
    .from('listings').select('id').eq('id', id).eq('host_id', hostRow.id).maybeSingle()
  if (!listing) return Response.json({ error: 'Listing not found or not yours.' }, { status: 403 })

  const { error } = await admin
    .from('listing_blocked_dates')
    .delete()
    .eq('id', blocked_date_id)
    .eq('listing_id', id)

  if (error) return Response.json({ error: 'Failed to delete blocked date.' }, { status: 500 })
  return Response.json({ success: true })
}
