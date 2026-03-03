import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — list saved payment methods
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_methods')
    .select('id, card_brand, card_last4, card_exp_month, card_exp_year, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — create a Stripe SetupIntent to add a new payment method
// The client uses the returned client_secret with Stripe.js to collect card details
export async function POST() {
  const { user, supabase } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  // Lazy-load stripe to avoid import errors if key is not set
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

  const admin = createAdminClient()

  // Get or create Stripe customer for this guest
  const { data: profile } = await admin
    .from('users')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await admin
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })

  return NextResponse.json({
    client_secret: setupIntent.client_secret,
    customer_id: customerId,
  })
}
