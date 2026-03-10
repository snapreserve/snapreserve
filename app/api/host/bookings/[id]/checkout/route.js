import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'
import { sendEmail, checkInEmailHtml, checkInEmailText } from '@/lib/send-email'

// POST /api/host/bookings/[id]/checkout
// Process an early check-out for a currently checked-in guest.
// Body: { early_checkout_date: 'YYYY-MM-DD', reason?: string }
export async function POST(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { early_checkout_date, reason = '', no_refund = false } = body

  if (!early_checkout_date) {
    return NextResponse.json({ error: 'early_checkout_date is required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  // Resolve host org + RBAC (owner or manager only)
  let hostUserId = null
  const { data: directHost } = await admin.from('hosts').select('id, user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id, role').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (mem) {
      if (!['owner', 'manager'].includes(mem.role)) {
        return NextResponse.json({ error: 'Only owners and managers can process early check-outs' }, { status: 403 })
      }
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
    }
  }
  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  // Fetch booking
  const { data: booking } = await admin
    .from('bookings')
    .select('*, listings(title, city, state, early_checkout_policy, early_checkout_partial_amount)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'checked_in') {
    return NextResponse.json({ error: `Early check-out only applies to checked-in bookings (current status: ${booking.status})` }, { status: 409 })
  }

  const todayUtc       = new Date().toISOString().slice(0, 10)
  const originalCheckout = (booking.check_out || '').toString().slice(0, 10)
  const newCheckout    = early_checkout_date.slice(0, 10)

  // Validate the new checkout date
  if (newCheckout >= originalCheckout) {
    return NextResponse.json({ error: 'Early check-out date must be before the original check-out date' }, { status: 400 })
  }
  if (newCheckout < booking.check_in) {
    return NextResponse.json({ error: 'Check-out date cannot be before check-in date' }, { status: 400 })
  }
  if (newCheckout > todayUtc) {
    return NextResponse.json({ error: 'Early check-out date cannot be in the future' }, { status: 400 })
  }

  // Calculate actual nights stayed and refund for unused nights
  const msPerDay       = 86400000
  const actualNights   = Math.round((new Date(newCheckout) - new Date(booking.check_in)) / msPerDay)
  const originalNights = Number(booking.nights) || 1
  const unusedNights   = originalNights - actualNights
  const pricePerNight  = Number(booking.price_per_night) || 0

  // Apply early checkout policy from the listing (can be overridden by no_refund flag)
  const listingPolicy = booking.listings?.early_checkout_policy || 'no_refund'
  let refundAmount = 0
  if (no_refund) {
    refundAmount = 0 // host explicitly waives refund
  } else {
    switch (listingPolicy) {
      case 'one_night_fee':
        // Guest pays 1 extra night as departure fee; rest refunded
        refundAmount = Math.max(0, Math.round(pricePerNight * Math.max(0, unusedNights - 1) * 100) / 100)
        break
      case 'partial_refund':
        refundAmount = Math.max(0, Number(booking.listings?.early_checkout_partial_amount) || 0)
        break
      case 'rebooked':
        // Full prorated refund — contingent on host confirming rebook (noted in refund_request)
        refundAmount = Math.max(0, Math.round(pricePerNight * unusedNights * 100) / 100)
        break
      case 'no_refund':
      default:
        refundAmount = 0
        break
    }
  }

  const now = new Date().toISOString()

  const updatePayload = {
    status:       'completed',
    check_out:    newCheckout,
    nights:       actualNights,
    refund_amount: refundAmount > 0 ? refundAmount : (booking.refund_amount ?? 0),
    ...(refundAmount > 0 ? { payment_status: 'refund_pending' } : {}),
    host_notes: [booking.host_notes, reason ? `Early check-out reason: ${reason}` : null]
      .filter(Boolean).join('\n') || null,
  }

  const { error: updateErr } = await admin
    .from('bookings')
    .update(updatePayload)
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Create refund_request for admin to process if there's a refund
  if (refundAmount > 0) {
    const { error: refundReqErr } = await admin
      .from('refund_requests')
      .insert({
        booking_id:   id,
        requested_by: user.id,
        reason:       reason || `Early check-out: ${unusedNights} unused night${unusedNights !== 1 ? 's' : ''}`,
        amount:       refundAmount,
        status:       'pending',
        notes:        `Early check-out on ${newCheckout}. Policy: ${listingPolicy}. Guest checked out ${unusedNights} night${unusedNights !== 1 ? 's' : ''} early. Refund: $${refundAmount.toFixed(2)}.${listingPolicy === 'rebooked' ? ' ⚠️ Contingent on host confirming the nights were rebooked.' : ''}`,
      })
    if (refundReqErr) console.error('[early-checkout] refund_requests insert:', refundReqErr.message)
  }

  // Email guest
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(booking.guest_id)
    const guestEmail = authUser?.user?.email
    const { data: guestProfile } = await admin.from('users').select('full_name').eq('id', booking.guest_id).maybeSingle()
    const guestName  = guestProfile?.full_name?.split(' ')[0] || authUser?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
    const tripsUrl   = `${baseUrl}/account/trips?booking=${id}`

    if (guestEmail) {
      await sendEmail({
        to:      guestEmail,
        subject: `Early check-out processed — ${booking.listings?.title || 'your stay'}`,
        html:    earlyCheckoutEmailHtml({
          guestName,
          listingTitle:  booking.listings?.title,
          city:          booking.listings?.city,
          state:         booking.listings?.state,
          originalCheckout,
          newCheckout,
          unusedNights,
          refundAmount,
          reference:     booking.reference,
          tripsUrl,
        }),
        text: earlyCheckoutEmailText({
          guestName,
          listingTitle:  booking.listings?.title,
          originalCheckout,
          newCheckout,
          unusedNights,
          refundAmount,
          reference:     booking.reference,
          tripsUrl,
        }),
      })
    }
  } catch (emailErr) {
    console.error('[early-checkout] email error:', emailErr.message)
  }

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  'host',
    action:     'booking.early_checkout',
    targetType: 'booking',
    targetId:   id,
    beforeData: { status: 'checked_in', check_out: originalCheckout, nights: originalNights },
    afterData:  { status: 'completed', check_out: newCheckout, nights: actualNights, refund_amount: refundAmount },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({
    success:          true,
    actual_nights:    actualNights,
    unused_nights:    unusedNights,
    refund_amount:    refundAmount,
    new_checkout:     newCheckout,
  })
}

/* ── Inline email templates (avoids circular dep) ── */
function BASE(content) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f1ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:40px auto;padding:0 20px 40px"><div style="text-align:center;padding:28px 0 24px"><span style="font-size:1.5rem;font-weight:900;color:#1A1410;letter-spacing:-0.02em">Snap<span style="color:#F4601A">Reserve™</span></span></div><div style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.07)">${content}</div><p style="text-align:center;font-size:0.72rem;color:#B8A898;margin-top:20px">© SnapReserve™ · <a href="https://snapreserve.app" style="color:#B8A898">snapreserve.app</a></p></div></body></html>`
}

function earlyCheckoutEmailHtml({ guestName, listingTitle, city, state, originalCheckout, newCheckout, unusedNights, refundAmount, reference, tripsUrl }) {
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  const safeTitle = (listingTitle || 'your stay').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeGuest = (guestName || 'there').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const refundLine = refundAmount > 0
    ? `<div style="background:#FFF2EC;border-radius:10px;padding:12px 16px;margin-bottom:22px;display:flex;align-items:center;gap:10px"><span style="font-size:1.1rem">💰</span><div><div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#C07848;margin-bottom:2px">Refund</div><div style="font-size:1rem;font-weight:800;color:#F4601A">$${refundAmount.toFixed(2)} pending</div><div style="font-size:0.75rem;color:#7A6355;margin-top:2px">${unusedNights} unused night${unusedNights !== 1 ? 's' : ''} will be refunded within 5–10 business days.</div></div></div>`
    : ''
  return BASE(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="width:56px;height:56px;background:#E0F2FE;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:14px">🏁</div>
      <h1 style="margin:0 0 8px;font-size:1.2rem;font-weight:800;color:#1A1410">Early check-out processed, ${safeGuest}</h1>
      <p style="margin:0;font-size:0.88rem;color:#7A6355;line-height:1.6">Your early departure from <strong style="color:#1A1410">${safeTitle}</strong> has been recorded.</p>
    </div>
    <div style="background:#F9F7F5;border-radius:12px;padding:20px 22px;margin-bottom:24px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Original Check-out</div>
          <div style="font-size:0.88rem;font-weight:600;color:#7A6355;text-decoration:line-through">${fmt(originalCheckout)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Actual Check-out</div>
          <div style="font-size:0.92rem;font-weight:700;color:#1A1410">${fmt(newCheckout)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Location</div>
          <div style="font-size:0.92rem;font-weight:700;color:#1A1410">${city || ''}${city && state ? ', ' : ''}${state || ''}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Reference</div>
          <div style="font-family:monospace;font-size:0.92rem;font-weight:800;color:#F4601A">${reference}</div>
        </div>
      </div>
    </div>
    ${refundLine}
    <a href="${tripsUrl}" style="display:block;text-align:center;background:#F4601A;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:0.95rem;margin:24px 0">View trip details →</a>
    <hr style="border:none;border-top:1px solid #EDE9E3;margin:24px 0"><p style="font-size:0.75rem;color:#C4B8AC;text-align:center;margin:0;line-height:1.6">Questions? Contact support@snapreserve.app.</p>
  `)
}

function earlyCheckoutEmailText({ guestName, listingTitle, originalCheckout, newCheckout, unusedNights, refundAmount, reference, tripsUrl }) {
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  const lines = [
    `Hi ${guestName || 'there'}, your early check-out has been processed.`,
    '',
    `Property: ${listingTitle}`,
    `Original check-out: ${fmt(originalCheckout)}`,
    `Actual check-out:   ${fmt(newCheckout)}`,
    `Reference: ${reference}`,
  ]
  if (refundAmount > 0) {
    lines.push('', `Refund: $${refundAmount.toFixed(2)} for ${unusedNights} unused night${unusedNights !== 1 ? 's' : ''} (pending, 5–10 business days)`)
  }
  lines.push('', `View your trip: ${tripsUrl}`, '', 'Questions? Contact support@snapreserve.app')
  return lines.join('\n')
}
