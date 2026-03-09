import { createAdminClient } from '@/lib/supabase-admin'
import stripe from '@/lib/stripe'
import { IS_PRODUCTION, IS_STAGING, APP_ENV } from '@/lib/env'
import { sendEmail, bookingConfirmationEmailHtml, bookingConfirmationEmailText } from '@/lib/send-email'
import { notifyHost } from '@/lib/notify-host'

// Stripe requires raw body for signature verification — disable Next.js body parsing
export const config = { api: { bodyParser: false } }

export async function POST(request) {
  const body          = await request.text()
  const sig           = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // In staging AND production the webhook secret is mandatory.
  // (NODE_ENV is 'production' on ALL Vercel deployments — we use APP_ENV instead.)
  const requiresVerification = IS_PRODUCTION || IS_STAGING

  if (requiresVerification && !webhookSecret) {
    console.error(`[SnapReserve™] CRITICAL: STRIPE_WEBHOOK_SECRET not set in ${APP_ENV}`)
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  try {
    if (webhookSecret && sig) {
      // Verify signature — used in staging + production
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else if (!requiresVerification) {
      // Development only — allow unsigned payloads for local testing with Stripe CLI
      console.warn('[SnapReserve™] Webhook: no signature verification (development only)')
      event = JSON.parse(body)
    } else {
      return Response.json({ error: 'Missing webhook signature' }, { status: 400 })
    }
  } catch (err) {
    console.error(`[SnapReserve™] Webhook signature error (${APP_ENV}):`, err.message)
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const { data: confirmedBookings, error } = await admin
      .from('bookings')
      .update({ status: 'confirmed', payment_status: 'paid' })
      .eq('payment_intent_id', pi.id)
      .eq('status', 'pending')
      .select('id, room_id')

    if (error) {
      console.error(`[SnapReserve™] Webhook: failed to confirm booking (${APP_ENV})`, error)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }

    // Decrement room inventory for hotel bookings
    for (const booking of (confirmedBookings || [])) {
      if (booking.room_id) {
        await admin.rpc('decrement_room_units', { p_room_id: booking.room_id, p_amount: 1 })
      }
    }

    // Send guest confirmation email + notify host for each confirmed booking
    for (const booking of (confirmedBookings || [])) {
      try {
        // Fetch full booking details for the email
        const { data: full } = await admin
          .from('bookings')
          .select(`
            id, reference, check_in, check_out, nights, guests, total_amount, host_id,
            listings ( title, city, state ),
            users!bookings_guest_id_fkey ( email, full_name )
          `)
          .eq('id', booking.id)
          .single()

        if (!full) continue

        const guestEmail = full.users?.email
        const guestName  = full.users?.full_name?.split(' ')[0] || 'there'
        const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
        const tripsUrl   = `${baseUrl}/account/trips`

        // Email to guest
        if (guestEmail) {
          await sendEmail({
            to:      guestEmail,
            subject: `Booking confirmed — ${full.listings?.title || 'your stay'}`,
            html:    bookingConfirmationEmailHtml({
              guestName,
              listingTitle: full.listings?.title,
              city:         full.listings?.city,
              state:        full.listings?.state,
              checkIn:      full.check_in,
              checkOut:     full.check_out,
              nights:       full.nights,
              guests:       full.guests,
              total:        full.total_amount,
              reference:    full.reference,
              tripsUrl,
            }),
            text: bookingConfirmationEmailText({
              guestName,
              listingTitle: full.listings?.title,
              city:         full.listings?.city,
              state:        full.listings?.state,
              checkIn:      full.check_in,
              checkOut:     full.check_out,
              nights:       full.nights,
              guests:       full.guests,
              total:        full.total_amount,
              reference:    full.reference,
              tripsUrl,
            }),
          })
        }

        // Notify host via in-app message
        const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        await notifyHost({
          hostUserId: full.host_id,
          type:       'info',
          subject:    `New booking — ${full.listings?.title || 'your listing'}`,
          body:       `A new booking has been confirmed.\n\nGuest: ${full.users?.full_name || 'Guest'}\nDates: ${fmt(full.check_in)} → ${fmt(full.check_out)} (${full.nights} night${full.nights !== 1 ? 's' : ''})\nGuests: ${full.guests}\nTotal: $${Number(full.total_amount).toFixed(2)}\nReference: ${full.reference}`,
        })
      } catch (notifyErr) {
        // Non-blocking — don't fail the webhook over notification errors
        console.error(`[SnapReserve™] Webhook: notification error for booking ${booking.id}:`, notifyErr.message)
      }
    }

    console.log(`[SnapReserve™] Webhook: booking confirmed for PI ${pi.id} (${APP_ENV})`)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object
    const { error } = await admin
      .from('bookings')
      .update({ status: 'cancelled', payment_status: 'failed' })
      .eq('payment_intent_id', pi.id)
      .eq('status', 'pending')

    if (error) {
      console.error(`[SnapReserve™] Webhook: failed to cancel booking (${APP_ENV})`, error)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    console.log(`[SnapReserve™] Webhook: booking cancelled for PI ${pi.id} (${APP_ENV})`)
  }

  return Response.json({ received: true })
}
