import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/admin/hosts/[id]/bookings?status=&listing_id=&from=&to=&page=1
// [id] is hosts.id (the host record id)
export async function GET(request, { params }) {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (error === 'mfa_required')    return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id: hostId } = await params
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')     || 'all'
  const listingId    = searchParams.get('listing_id') || null
  const fromDate     = searchParams.get('from')        || null
  const toDate       = searchParams.get('to')          || null
  const page         = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit        = 50
  const offset       = (page - 1) * limit

  const admin = createAdminClient()

  // Resolve host user_id from hostId (hosts.id)
  const { data: hostRow } = await admin.from('hosts').select('user_id').eq('id', hostId).maybeSingle()
  if (!hostRow) return NextResponse.json({ error: 'Host not found' }, { status: 404 })

  let q = admin
    .from('bookings')
    .select(
      'id, reference, status, payment_status, total_amount, service_fee, refund_amount, nights, check_in, check_out, guest_id, listing_id, cancelled_by_role, created_at, listings(id, title, city)',
      { count: 'exact' }
    )
    .eq('host_id', hostRow.user_id)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') {
    if (statusFilter === 'cancelled') q = q.in('status', ['cancelled', 'refunded'])
    else q = q.eq('status', statusFilter)
  }
  if (listingId) q = q.eq('listing_id', listingId)
  if (fromDate)  q = q.gte('created_at', new Date(fromDate).toISOString())
  if (toDate)    q = q.lte('created_at', new Date(toDate + 'T23:59:59').toISOString())

  q = q.range(offset, offset + limit - 1)

  const { data: rows, count, error: qErr } = await q
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  // Enrich with guest info
  const guestIds = [...new Set((rows || []).map(b => b.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', guestIds)
    : { data: [] }
  const guestMap = Object.fromEntries((guests || []).map(g => [g.id, g]))

  const bookings = (rows || []).map(b => {
    const g = guestMap[b.guest_id] || {}
    const hostPayout = Math.max(0, (Number(b.total_amount) || 0) - (Number(b.service_fee) || 0))
    const payoutStatus = b.status === 'completed' && b.payment_status === 'paid' ? 'released'
      : b.status === 'checked_in' ? 'releasing'
      : b.status === 'cancelled' ? 'refunded' : 'pending'
    return {
      id:              b.id,
      reference:       b.reference || b.id.slice(0, 8).toUpperCase(),
      status:          b.status,
      payment_status:  b.payment_status,
      total_amount:    b.total_amount,
      service_fee:     b.service_fee,
      host_payout:     Math.round(hostPayout * 100) / 100,
      refund_amount:   b.refund_amount,
      nights:          b.nights,
      check_in:        b.check_in,
      check_out:       b.check_out,
      listing_id:      b.listing_id,
      listing_title:   b.listings?.title || '—',
      listing_city:    b.listings?.city  || '',
      guest_name:      g.full_name || g.email || '—',
      guest_email:     g.email || '',
      cancelled_by:    b.cancelled_by_role || null,
      payout_status:   payoutStatus,
      created_at:      b.created_at,
    }
  })

  return NextResponse.json({ bookings, total: count ?? 0, page, limit })
}
