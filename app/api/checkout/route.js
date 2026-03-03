import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

    const body = await request.json()
    const { listing_id, room_id, check_in, check_out, guests } = body

    if (!listing_id || !check_in || !check_out) {
      return Response.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return Response.json({ error: 'Invalid dates provided.' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (checkInDate < today) {
      return Response.json({ error: 'Check-in date must be today or in the future.' }, { status: 400 })
    }

    const nights = Math.round((checkOutDate - checkInDate) / 86400000)
    if (nights < 1) return Response.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    if (nights > 365) return Response.json({ error: 'Maximum stay is 365 nights.' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch listing
    const { data: listing } = await admin
      .from('listings')
      .select('id, title, city, state, host_id, price_per_night, cleaning_fee, max_guests, is_active, is_instant_book, cancellation_policy, rating, review_count')
      .eq('id', listing_id)
      .single()

    if (!listing) return Response.json({ error: 'Listing not found.' }, { status: 404 })
    if (!listing.is_active) return Response.json({ error: 'This listing is no longer available.' }, { status: 400 })

    const guestsCount = Math.min(Number(guests) || 1, listing.max_guests)

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

    // Resolve host user_id from hosts table (listing.host_id = hosts.id)
    let hostUserId = listing.host_id
    const { data: hostRow } = await admin
      .from('hosts')
      .select('user_id')
      .eq('id', listing.host_id)
      .maybeSingle()
    if (hostRow?.user_id) hostUserId = hostRow.user_id

    // Calculate amounts
    const serviceFeePct = 0.032
    const subtotal = pricePerNight * nights
    const cleaningFee = listing.cleaning_fee || 0
    const serviceFee = Math.round(subtotal * serviceFeePct)
    const totalAmount = subtotal + cleaningFee + serviceFee

    // Get user email for receipt
    const { data: userProfile } = await admin
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .maybeSingle()
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
        price_per_night: pricePerNight,
        cleaning_fee: cleaningFee,
        service_fee: serviceFee,
        total_amount: totalAmount,
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
        serviceFee,
        total: totalAmount,
      },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
