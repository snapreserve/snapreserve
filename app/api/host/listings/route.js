import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request) {
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  // Verify the JWT token
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

  // Get host record
  const { data: hostRow } = await admin
    .from('hosts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!hostRow) return Response.json({ error: 'Not a host' }, { status: 403 })

  // Fetch ALL listings for this host (service role bypasses RLS)
  const { data: listings, error } = await admin
    .from('listings')
    .select('id, title, city, state, price_per_night, status, is_active, images, rating, review_count, created_at')
    .eq('host_id', hostRow.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: 'Failed to fetch listings' }, { status: 500 })

  return Response.json({ listings: listings || [] })
}
