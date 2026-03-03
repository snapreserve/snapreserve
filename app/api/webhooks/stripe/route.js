import { createAdminClient } from '@/lib/supabase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const isProd = process.env.NODE_ENV === 'production'

  // In production, webhook secret is mandatory — fail loudly so misconfiguration is caught
  if (isProd && !webhookSecret) {
    console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not set in production')
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else if (!isProd) {
      // Development only — allow unsigned payloads for local testing
      console.warn('Webhook: running without signature verification (dev mode only)')
      event = JSON.parse(body)
    } else {
      return Response.json({ error: 'Missing webhook signature' }, { status: 400 })
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const { error } = await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
      })
      .eq('payment_intent_id', pi.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Webhook: failed to confirm booking', error)
      // Return 500 so Stripe retries the webhook
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    console.log('Webhook: booking confirmed for PI', pi.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object
    const { error } = await admin
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
      })
      .eq('payment_intent_id', pi.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Webhook: failed to cancel booking', error)
      // Return 500 so Stripe retries the webhook
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    console.log('Webhook: booking cancelled (payment failed) for PI', pi.id)
  }

  return Response.json({ received: true })
}
