import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import stripe from '@/lib/stripe'
import { calcPlatformFee } from '@/lib/platform-fee'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Please log in to book.' }, { status: 401 })

    // Rate limit: max 10 checkout attempts per user per hour to prevent abuse
    const rl = rateLimit(`checkout:${user.id}`, 10, 60 * 60 * 1000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body = await request.json()
    const { listing_id, room_id, check_in, check_out, guests, promo_code } = body

    if (!listing_id || !check_in || !check_out) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return Response.json({ error: 'Invalid dates provided.' }, { status: 400 })
    }

    const todayStr = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD" in UTC
    if (check_in < todayStr) {
      return Response.json({ error: 'Check-in date must be today or in the future.' }, { status: 400 })
    }

    const nights = Math.round((checkOutDate - checkInDate) / 86400000)
    if (nights < 1) return Response.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    if (nights > 365) return Response.json({ error: 'Maximum stay is 365 nights.' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch listing
    const { data: listing } = await admin
      .from('listings')
      .select('id, title, city, state, host_id, price_per_night, cleaning_fee, max_guests, min_nights, is_active, status, is_instant_book, cancellation_policy, rating, review_count')
      .eq('id', listing_id)
      .single()

    if (!listing) return Response.json({ error: 'Listing not found.' }, { status: 404 })
    if (!listing.is_active) return Response.json({ error: 'This listing is no longer available.' }, { status: 400 })
    if (listing.status === 'suspended') return Response.json({ error: 'This listing is temporarily unavailable.' }, { status: 400 })

    const guestsCount = Math.min(Number(guests) || 1, listing.max_guests)

    // Minimum stay validation
    if (listing.min_nights && nights < listing.min_nights) {
      return Response.json({ error: `Minimum stay is ${listing.min_nights} night${listing.min_nights !== 1 ? 's' : ''}.` }, { status: 400 })
    }

    // ── Availability check ──────────────────────────────────────────────
    // Reject if any non-cancelled booking overlaps the requested dates.
    // Overlap condition (exclusive end): new.check_in < existing.check_out AND new.check_out > existing.check_in
    const { count: conflictCount } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listing_id)
      .not('status', 'in', '("cancelled","refunded")')
      .lt('check_in', check_out)   // existing starts before new checkout
      .gt('check_out', check_in)  // existing ends after new check-in

    if (conflictCount && conflictCount > 0) {
      return Response.json({ error: 'These dates are already booked. Please choose different dates.' }, { status: 400 })
    }

    // Resolve price — use room price if room selected
    let pricePerNight = listing.price_per_night
    let roomId = null
    if (room_id) {
      const { data: room } = await admin
        .from('rooms')
        .select('id, price_per_night, is_available')
        .eq('id', room_id)
        .eq('listing_id', listing_id)
        .single()

      if (!room || !room.is_available) {
        return Response.json({ error: 'Selected room is not available.' }, { status: 400 })
      }
      pricePerNight = room.price_per_night
      roomId = room.id
    }

    // Resolve host user_id and founder status from hosts table (listing.host_id = hosts.id)
    let hostUserId = listing.host_id
    let isFounderHost = false
    const { data: hostRow } = await admin
      .from('hosts')
      .select('user_id, is_founder_host')
      .eq('id', listing.host_id)
      .maybeSingle()
    if (hostRow?.user_id) hostUserId = hostRow.user_id
    if (hostRow?.is_founder_host) isFounderHost = true

    // Calculate amounts — NO guest-facing service fee; host pays platform fee instead
    const subtotal    = pricePerNight * nights
    const cleaningFee = listing.cleaning_fee || 0

    // Apply promo code if provided (server-side validation)
    let discountAmount = 0
    let promotionId    = null
    if (promo_code) {
      const { data: promo } = await admin
        .from('promotions')
        .select('*')
        .eq('host_id', listing.host_id)
        .eq('code', promo_code.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle()

      const nowIso = new Date().toISOString()
      const promoValid = promo
        && (!promo.starts_at || nowIso >= promo.starts_at)
        && (!promo.ends_at   || nowIso <= promo.ends_at)
        && (promo.max_uses === null || promo.uses_count < promo.max_uses)
        && nights >= (promo.min_nights || 1)
        && subtotal >= (promo.min_booking_amount || 0)
        && (!promo.listing_ids?.length || promo.listing_ids.includes(listing_id))

      if (promoValid) {
        // Per-user limit check
        const { count: userUses } = await admin
          .from('promotion_uses')
          .select('id', { count: 'exact', head: true })
          .eq('promotion_id', promo.id)
          .eq('guest_id', user.id)

        if ((userUses || 0) < (promo.max_uses_per_user || 1)) {
          promotionId = promo.id
          if (promo.discount_type === 'percentage') {
            discountAmount = Math.round((subtotal * promo.discount_value / 100) * 100) / 100
          } else {
            discountAmount = Math.min(Number(promo.discount_value), subtotal)
          }
        }
      }
    }

    const totalAmount = subtotal + cleaningFee - discountAmount   // guests pay discounted total

    // Platform fee charged to host — 6.5%+$1 for Founder hosts, 7%+$1 for standard
    const { platformFeePct, platformFee, platformFixedFee } = calcPlatformFee(totalAmount, isFounderHost)

    // Get user profile — also checks is_team_member flag to block booking
    const { data: userProfile } = await admin
      .from('users')
      .select('email, full_name, is_team_member')
      .eq('id', user.id)
      .maybeSingle()

    // Team-only accounts can't book as guests — they have host portal access only
    if (userProfile?.is_team_member) {
      return Response.json({
        error: 'Team member accounts are for hosting only. To book as a guest, create a separate personal account at snapreserve.app/signup.',
      }, { status: 403 })
    }

    const email = userProfile?.email || user.email

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100, // cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: {
        listing_id,
        room_id: roomId || '',
        guest_id: user.id,
        check_in,
        check_out,
        nights: String(nights),
        guests: String(guestsCount),
      },
    })

    // Generate unique reference
    const reference = 'SR' + Date.now().toString(36).toUpperCase().slice(-6)

    // Create pending booking record
    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .insert({
        listing_id,
        room_id: roomId,
        guest_id: user.id,
        host_id: hostUserId,
        check_in,
        check_out,
        nights,
        guests: guestsCount,
        price_per_night:    pricePerNight,
        cleaning_fee:       cleaningFee,
        service_fee:        0,             // legacy column — no guest-facing fee
        discount_amount:    discountAmount,
        promotion_id:       promotionId,
        promo_code:         promotionId ? promo_code.trim().toUpperCase() : null,
        total_amount:       totalAmount,
        platform_fee:       platformFee,
        platform_fixed_fee: platformFixedFee,
        status: 'pending',
        payment_status: 'pending',
        payment_intent_id: paymentIntent.id,
        payment_provider: 'stripe',
        reference,
        cancellation_policy: listing.cancellation_policy || 'flexible',
      })
      .select('id')
      .single()

    if (bookingError) {
      // Cancel the PaymentIntent so it doesn't linger
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {})
      console.error('Booking insert error:', bookingError)
      return Response.json({ error: 'Failed to create booking.' }, { status: 500 })
    }

    // Record promotion use and increment counter (non-blocking)
    if (promotionId) {
      Promise.all([
        admin.from('promotion_uses').insert({
          promotion_id:    promotionId,
          booking_id:      booking.id,
          guest_id:        user.id,
          discount_amount: discountAmount,
          original_amount: subtotal + cleaningFee,
        }),
        admin.rpc('increment_promotion_uses', { promo_id: promotionId }),
      ]).catch(() => {})
    }

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      bookingId: booking.id,
      listing: {
        title: listing.title,
        city: listing.city,
        state: listing.state,
        rating: listing.rating,
        review_count: listing.review_count,
      },
      breakdown: {
        nights,
        pricePerNight,
        subtotal,
        cleaningFee,
        discountAmount,
        promoCode:    promotionId ? promo_code.trim().toUpperCase() : null,
        total: totalAmount,
      },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
