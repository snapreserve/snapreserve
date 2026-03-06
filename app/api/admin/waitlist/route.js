import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (!role) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    || 'all'
  const roleF     = searchParams.get('role')      || 'all'
  const founderEl = searchParams.get('founder_eligible')
  const founderAs = searchParams.get('founder_assigned')
  const country   = searchParams.get('country')   || 'all'
  const search    = searchParams.get('search')    || ''
  const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit     = 50

  const supabase = createAdminClient()

  let q = supabase
    .from('waitlist_v2_signups')
    .select('id, email, first_name, last_name, city, state, country, role, interest, property_type, referral_code, referred_by, signup_source, status, founder_eligible, founder_assigned, founder_region, founder_spot_number, admin_notes, removed_at, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status !== 'all') q = q.eq('status', status)
  if (roleF !== 'all') q = q.eq('role', roleF)
  if (founderEl === 'true')  q = q.eq('founder_eligible', true)
  if (founderAs === 'true')  q = q.eq('founder_assigned', true)
  if (country !== 'all') q = q.eq('country', country)
  if (search) {
    q = q.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,city.ilike.%${search}%`)
  }

  q = q.range((page - 1) * limit, page * limit - 1)

  const { data, count, error: dbErr } = await q
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Stats aggregation (unfiltered)
  const { data: allRows } = await supabase
    .from('waitlist_v2_signups')
    .select('role, status, founder_eligible, founder_assigned, country')

  const stats = {
    total:          allRows?.length ?? 0,
    hosts:          allRows?.filter(r => r.role === 'host').length ?? 0,
    travelers:      allRows?.filter(r => r.role === 'traveler' || r.role === 'guest').length ?? 0,
    both:           allRows?.filter(r => r.role === 'both').length ?? 0,
    pending:        allRows?.filter(r => r.status === 'pending').length ?? 0,
    founderEligible:allRows?.filter(r => r.founder_eligible).length ?? 0,
    founderAssigned:allRows?.filter(r => r.founder_assigned).length ?? 0,
    intl:           allRows?.filter(r => r.country && r.country !== 'United States').length ?? 0,
    invited:        allRows?.filter(r => r.status === 'invited').length ?? 0,
  }

  return NextResponse.json({ entries: data ?? [], total: count ?? 0, stats })
}
