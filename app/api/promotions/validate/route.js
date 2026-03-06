import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/promotions/validate
// Validates a promo code for a given listing/booking context.
// Returns { valid, discount_amount, ... } or { valid: false, error }
export async function POST(request) {
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
  if (!user) return NextResponse.json({ error: 'Please log in to apply a promo code' }, { status: 401 })

  // Rate limit: 30 promo validations per user per minute (prevents brute-force code guessing)
  const rl = rateLimit(`promo-validate:${user.id}`, 30, 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const body = await request.json().catch(() => ({}))
  const { code, listing_id, nights, subtotal } = body

  if (!code?.trim())  return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
  if (!listing_id)    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: listing } = await admin
    .from('listings')
    .select('id, host_id')
    .eq('id', listing_id)
    .maybeSingle()

  if (!listing) return NextResponse.json({ valid: false, error: 'Listing not found' })

  const { data: promo } = await admin
    .from('promotions')
    .select('*')
    .eq('host_id', listing.host_id)
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle()

  if (!promo) return NextResponse.json({ valid: false, error: 'Invalid promo code' })

  if (promo.starts_at && now < promo.starts_at) {
    return NextResponse.json({ valid: false, error: 'This promo code is not yet active' })
  }
  if (promo.ends_at && now > promo.ends_at) {
    return NextResponse.json({ valid: false, error: 'This promo code has expired' })
  }
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' })
  }
  if (nights && promo.min_nights > 1 && Number(nights) < promo.min_nights) {
    return NextResponse.json({ valid: false, error: `This promo requires a minimum stay of ${promo.min_nights} nights` })
  }
  if (subtotal && promo.min_booking_amount > 0 && Number(subtotal) < promo.min_booking_amount) {
    return NextResponse.json({ valid: false, error: `This promo requires a minimum booking of $${promo.min_booking_amount}` })
  }
  if (promo.listing_ids?.length > 0 && !promo.listing_ids.includes(listing_id)) {
    return NextResponse.json({ valid: false, error: 'This promo code is not valid for this listing' })
  }
  if (promo.max_uses_per_user > 0) {
    const { count } = await admin
      .from('promotion_uses')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promo.id)
      .eq('guest_id', user.id)
    if ((count || 0) >= promo.max_uses_per_user) {
      return NextResponse.json({ valid: false, error: 'You have already used this promo code' })
    }
  }

  const bookingSubtotal = Number(subtotal) || 0
  let discountAmount = 0
  if (promo.discount_type === 'percentage') {
    discountAmount = Math.round((bookingSubtotal * promo.discount_value / 100) * 100) / 100
  } else {
    discountAmount = Math.min(Number(promo.discount_value), bookingSubtotal)
  }

  return NextResponse.json({
    valid:          true,
    promotion_id:   promo.id,
    code:           promo.code,
    name:           promo.name,
    discount_type:  promo.discount_type,
    discount_value: promo.discount_value,
    discount_amount: discountAmount,
  })
}
