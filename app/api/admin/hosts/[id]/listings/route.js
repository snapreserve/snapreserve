import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/admin/hosts/[id]/listings?status=&search=&city=&page=1
// [id] is hosts.id (the host record id, NOT user_id)
export async function GET(request, { params }) {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (error === 'mfa_required')    return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id: hostId } = await params
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') || 'all'
  const search       = (searchParams.get('search') || '').trim()
  const city         = (searchParams.get('city')   || '').trim()
  const page         = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit        = 50
  const offset       = (page - 1) * limit

  const admin = createAdminClient()

  let q = admin
    .from('listings')
    .select('id, title, city, state, status, is_active, price_per_night, rating, review_count, type, created_at, deleted_at', { count: 'exact' })
    .eq('host_id', hostId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (statusFilter === 'pending') {
    q = q.in('status', ['pending', 'pending_review'])
  } else if (statusFilter !== 'all') {
    q = q.eq('status', statusFilter)
  }
  if (city) q = q.ilike('city', `%${city}%`)

  q = q.range(offset, offset + limit - 1)

  const { data: listings, count, error: qErr } = await q
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  let rows = listings || []
  if (search) {
    const lc = search.toLowerCase()
    rows = rows.filter(l => l.title?.toLowerCase().includes(lc) || l.city?.toLowerCase().includes(lc))
  }

  return NextResponse.json({ listings: rows, total: count ?? 0, page, limit })
}
