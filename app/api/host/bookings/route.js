import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { bookingHostPayout } from '@/lib/platform-fee'

// Derive payout status from booking status/payment_status
function payoutStatus(b) {
  if (b.status === 'completed' && b.payment_status === 'paid') return 'released'
  if (b.status === 'checked_in' && b.payment_status === 'paid') return 'releasing'
  if (['confirmed', 'checked_in'].includes(b.status) && b.payment_status === 'paid') return 'pending'
  if (b.status === 'cancelled' || b.payment_status === 'refunded') return 'refunded'
  return 'pending'
}

// GET /api/host/bookings?listing_id=&status=&page=1&limit=25
export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingId    = searchParams.get('listing_id') || null
  const statusFilter = searchParams.get('status')     || null   // 'upcoming'|'completed'|'cancelled'
  const page         = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit        = Math.min(300, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))
  const offset       = (page - 1) * limit

  const admin = createAdminClient()

  // ── Resolve host user_id + team member's allowed listings ─────────────────
  let hostUserId = null
  let allowedListingIds = null   // null = all listings; array = restricted

  // Direct host
  const { data: hostRow } = await admin
    .from('hosts')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (hostRow) {
    hostUserId = user.id // bookings.host_id stores host's user_id
  } else {
    // Team member — find the org owner's user_id + property access
    const { data: membership } = await admin
      .from('host_team_members')
      .select('host_id, role, status, allowed_listing_ids')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membership) {
      const { data: ownerHost } = await admin
        .from('hosts')
        .select('user_id')
        .eq('id', membership.host_id)
        .maybeSingle()
      hostUserId = ownerHost?.user_id || null
      // Restrict to allowed listings if set (null = full access)
      if (Array.isArray(membership.allowed_listing_ids) && membership.allowed_listing_ids.length > 0) {
        allowedListingIds = membership.allowed_listing_ids
      }
    }
  }

  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 404 })

  // ── Lazy auto-complete: checked_in bookings past checkout date ────────────
  await admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('host_id', hostUserId)
    .eq('status', 'checked_in')
    .lt('check_out', new Date().toISOString().slice(0, 10))

  // ── Metrics: all bookings (not paginated) ─────────────────────────────────
  let metricsQ = admin
    .from('bookings')
    .select('status, payment_status, total_amount, service_fee, platform_fee, platform_fixed_fee, refund_amount, check_in')
    .eq('host_id', hostUserId)
  if (allowedListingIds) metricsQ = metricsQ.in('listing_id', allowedListingIds)
  const { data: allBookings } = await metricsQ

  const all      = allBookings || []
  const now      = new Date()
  const completed  = all.filter(b => b.status === 'completed')
  const confirmed  = all.filter(b => b.status === 'confirmed')
  const checkedIn  = all.filter(b => b.status === 'checked_in')
  const upcoming   = [...confirmed, ...checkedIn].filter(b => new Date(b.check_in) > now)
  const cancelled  = all.filter(b => b.status === 'cancelled')

  const totalEarned   = completed.reduce((s, b) => s + bookingHostPayout(b), 0)
  const pendingPayout = [...confirmed, ...checkedIn].reduce((s, b) => s + bookingHostPayout(b), 0)
  const totalRefunds  = cancelled.reduce((s, b) => s + (Number(b.refund_amount) || 0), 0)
  const bookingCount  = all.filter(b => ['confirmed', 'checked_in', 'completed'].includes(b.status)).length

  const metrics = {
    total_earned:    Math.round(totalEarned   * 100) / 100,
    pending_payout:  Math.round(pendingPayout * 100) / 100,
    upcoming_stays:  upcoming.length,
    total_refunds:   Math.round(totalRefunds  * 100) / 100,
    booking_count:   bookingCount,
    completed_count:  completed.length,
    checked_in_count: checkedIn.length,
    cancelled_count:  cancelled.length,
  }

  // ── Paginated bookings ────────────────────────────────────────────────────
  let q = admin
    .from('bookings')
    .select(
      'id, reference, listing_id, guest_id, check_in, check_out, guests, nights, price_per_night, cleaning_fee, service_fee, platform_fee, platform_fixed_fee, total_amount, status, payment_status, payment_intent_id, refund_amount, stripe_refund_id, cancelled_at, checked_in_at, created_at, listings(id, title, city, state, type)',
      { count: 'exact' }
    )
    .eq('host_id', hostUserId)
    .order('created_at', { ascending: false })

  // Apply listing filter(s)
  if (allowedListingIds) {
    if (listingId) {
      // Only return results if the requested listing is in the allowed set
      if (allowedListingIds.includes(listingId)) q = q.eq('listing_id', listingId)
      else q = q.eq('listing_id', 'none') // ensures 0 results
    } else {
      q = q.in('listing_id', allowedListingIds)
    }
  } else if (listingId) {
    q = q.eq('listing_id', listingId)
  }

  // Map UI status filter → DB statuses
  if (statusFilter === 'upcoming')   q = q.in('status', ['confirmed', 'checked_in'])
  if (statusFilter === 'completed')  q = q.eq('status', 'completed')
  if (statusFilter === 'cancelled')  q = q.in('status', ['cancelled', 'refunded'])
  if (statusFilter === 'checked_in') q = q.eq('status', 'checked_in')

  q = q.range(offset, offset + limit - 1)

  const { data: bookings, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with guest profiles
  const guestIds = [...new Set((bookings || []).map(b => b.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', guestIds)
    : { data: [] }
  const guestMap = Object.fromEntries((guests || []).map(g => [g.id, g]))

  const rows = (bookings || []).map(b => {
    const g = guestMap[b.guest_id] || {}
    const hostEarnings = bookingHostPayout(b)
    const pfee = (Number(b.platform_fee) || 0) + (Number(b.platform_fixed_fee) || 0)
    return {
      id:               b.id,
      reference:        b.reference || b.id.slice(0, 8).toUpperCase(),
      listing_id:       b.listing_id,
      listing_title:    b.listings?.title  || '—',
      listing_city:     b.listings?.city   || '',
      listing_state:    b.listings?.state  || '',
      listing_type:     b.listings?.type   || '',
      guest_name:       g.full_name || g.email || '—',
      guest_email:      g.email || '',
      check_in:         b.check_in,
      check_out:        b.check_out,
      guests:           b.guests,
      nights:           b.nights,
      price_per_night:  b.price_per_night,
      cleaning_fee:     b.cleaning_fee,
      total_amount:       b.total_amount,
      platform_fee:       Number(b.platform_fee) || 0,
      platform_fixed_fee: Number(b.platform_fixed_fee) || 0,
      total_platform_fee: pfee,
      host_earnings:      hostEarnings,
      refund_amount:    b.refund_amount,
      status:           b.status,
      payment_status:   b.payment_status,
      payment_intent_id: b.payment_intent_id,
      payout_status:    payoutStatus(b),
      checked_in_at:    b.checked_in_at,
      created_at:       b.created_at,
      cancelled_at:     b.cancelled_at,
    }
  })

  return NextResponse.json({ bookings: rows, total: count ?? 0, page, limit, metrics })
}
