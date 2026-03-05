import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

// Estimated Stripe processing fee
const STRIPE_PCT  = 0.029
const STRIPE_FLAT = 0.30

function toCSV(rows, cols) {
  const esc = v => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
}

function dateRange(preset) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  if (preset === 'today')  return [new Date(y, m, d).toISOString(), new Date(y, m, d, 23, 59, 59).toISOString()]
  if (preset === 'week')   return [new Date(y, m, d - now.getDay()).toISOString(), now.toISOString()]
  if (preset === 'month')  return [new Date(y, m, 1).toISOString(), now.toISOString()]
  if (preset === 'year')   return [new Date(y, 0, 1).toISOString(), now.toISOString()]
  return [new Date(y, m, 1).toISOString(), now.toISOString()] // default: month
}

export async function GET(request) {
  const { role, error, user } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (error === 'mfa_required')    return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Only admin, super_admin, finance
  if (!['admin', 'super_admin', 'finance'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const preset    = searchParams.get('preset')   || 'month'
  const customFrom = searchParams.get('from')
  const customTo   = searchParams.get('to')
  const hostId     = searchParams.get('host_id')    || null
  const listingId  = searchParams.get('listing_id') || null
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit      = 50
  const isExport   = searchParams.get('export') === 'true'

  let fromDate, toDate
  if (preset === 'custom' && customFrom && customTo) {
    fromDate = new Date(customFrom).toISOString()
    toDate   = new Date(customTo + 'T23:59:59').toISOString()
  } else {
    ;[fromDate, toDate] = dateRange(preset)
  }

  const admin = createAdminClient()

  // ── Metrics: aggregate all bookings in range ──────────────────────────────
  let metricsQ = admin
    .from('bookings')
    .select('status, payment_status, total_amount, service_fee, platform_fee, platform_fixed_fee, cleaning_fee, refund_amount')
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
  if (hostId)    metricsQ = metricsQ.eq('host_id', hostId)
  if (listingId) metricsQ = metricsQ.eq('listing_id', listingId)

  const { data: rawBookings } = await metricsQ

  const all      = rawBookings || []
  const active   = all.filter(b => ['confirmed', 'completed'].includes(b.status))
  const pending  = all.filter(b => b.status === 'pending')

  const gmv             = active.reduce((s, b) => s + (Number(b.total_amount) || 0), 0)
  // Platform revenue = new host platform fees (7% + $1); fall back to legacy service_fee
  const platformRevenue = active.reduce((s, b) => {
    const pf = (Number(b.platform_fee) || 0) + (Number(b.platform_fixed_fee) || 0)
    return s + (pf > 0 ? pf : (Number(b.service_fee) || 0))
  }, 0)
  const hostPayouts     = gmv - platformRevenue
  const totalRefunds    = all.reduce((s, b)     => s + (Number(b.refund_amount) || 0), 0)
  const bookingCount    = active.length
  const processingFees  = gmv * STRIPE_PCT + bookingCount * STRIPE_FLAT
  const netRevenue      = platformRevenue - totalRefunds - processingFees

  const metrics = {
    gmv:             Math.round(gmv * 100) / 100,
    platform_revenue: Math.round(platformRevenue * 100) / 100,
    host_payouts:    Math.round(hostPayouts * 100) / 100,
    total_refunds:   Math.round(totalRefunds * 100) / 100,
    processing_fees: Math.round(processingFees * 100) / 100,
    net_revenue:     Math.round(netRevenue * 100) / 100,
    booking_count:   bookingCount,
    pending_count:   pending.length,
    avg_booking_value: bookingCount > 0 ? Math.round((gmv / bookingCount) * 100) / 100 : 0,
  }

  // ── Transactions: paginated ───────────────────────────────────────────────
  const offset = (page - 1) * limit

  let txQ = admin
    .from('bookings')
    .select(
      'id, reference, status, payment_status, total_amount, service_fee, cleaning_fee, nights, price_per_night, refund_amount, payment_intent_id, check_in, check_out, created_at, guest_id, host_id, listing_id, listings(id, title, city, type)',
      { count: 'exact' }
    )
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: false })

  if (hostId)    txQ = txQ.eq('host_id', hostId)
  if (listingId) txQ = txQ.eq('listing_id', listingId)

  // For export: fetch all; otherwise paginate
  if (!isExport) txQ = txQ.range(offset, offset + limit - 1)

  const { data: txns, count: totalCount } = await txQ

  // Enrich with guest + host info
  const rows = txns || []
  const guestIds   = [...new Set(rows.map(t => t.guest_id).filter(Boolean))]
  const hostIds    = [...new Set(rows.map(t => t.host_id).filter(Boolean))]

  const [{ data: guests }, { data: hostRows }] = await Promise.all([
    guestIds.length ? admin.from('users').select('id, full_name, email').in('id', guestIds) : Promise.resolve({ data: [] }),
    hostIds.length  ? admin.from('hosts').select('id, user_id, display_name').in('id', hostIds) : Promise.resolve({ data: [] }),
  ])

  const hostUserIds = (hostRows || []).map(h => h.user_id).filter(Boolean)
  const { data: hostUsers } = hostUserIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', hostUserIds)
    : { data: [] }

  const guestMap    = Object.fromEntries((guests   || []).map(g => [g.id, g]))
  const hostMap     = Object.fromEntries((hostRows || []).map(h => [h.id, h]))
  const hostUserMap = Object.fromEntries((hostUsers || []).map(u => [u.id, u]))

  const transactions = rows.map(t => {
    const hRow   = hostMap[t.host_id]
    const hUser  = hRow ? hostUserMap[hRow.user_id] : null
    return {
      id:              t.id,
      reference:       t.reference || t.id.slice(0, 8).toUpperCase(),
      status:          t.status,
      payment_status:  t.payment_status,
      total_amount:    t.total_amount,
      service_fee:     t.service_fee,
      cleaning_fee:    t.cleaning_fee,
      nights:          t.nights,
      price_per_night: t.price_per_night,
      refund_amount:   t.refund_amount,
      host_payout: (() => {
        const pf = (Number(t.platform_fee) || 0) + (Number(t.platform_fixed_fee) || 0)
        const fee = pf > 0 ? pf : (Number(t.service_fee) || 0)
        return Math.round(((Number(t.total_amount) || 0) - fee) * 100) / 100
      })(),
      payment_intent_id: t.payment_intent_id || null,
      check_in:        t.check_in,
      check_out:       t.check_out,
      created_at:      t.created_at,
      listing_title:   t.listings?.title || '—',
      listing_city:    t.listings?.city  || '',
      listing_type:    t.listings?.type  || '',
      guest_name:      guestMap[t.guest_id]?.full_name || guestMap[t.guest_id]?.email || '—',
      guest_email:     guestMap[t.guest_id]?.email || '',
      host_name:       hRow?.display_name || hUser?.full_name || hUser?.email || '—',
      host_email:      hUser?.email || '',
    }
  })

  // CSV export
  if (isExport) {
    const cols = [
      'reference','created_at','status','payment_status','payment_intent_id',
      'listing_title','listing_city','host_name','guest_name',
      'nights','price_per_night','cleaning_fee','service_fee','total_amount',
      'host_payout','refund_amount','check_in','check_out',
    ]
    const csv = toCSV(transactions, cols)
    const filename = `finance-${preset}-${new Date().toISOString().split('T')[0]}.csv`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ metrics, transactions, total: totalCount ?? 0, page, limit })
}
