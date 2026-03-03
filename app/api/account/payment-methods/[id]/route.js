import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// DELETE — remove a payment method from Stripe + DB
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Verify ownership
  const { data: pm } = await admin
    .from('payment_methods')
    .select('stripe_payment_method_id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (!pm || pm.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (stripeKey) {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
    await stripe.paymentMethods.detach(pm.stripe_payment_method_id).catch(() => null)
  }

  const { error } = await admin.from('payment_methods').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH — set as default payment method
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Verify ownership
  const { data: pm } = await admin
    .from('payment_methods')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (!pm || pm.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Clear existing default, set new one
  await admin
    .from('payment_methods')
    .update({ is_default: false })
    .eq('user_id', user.id)

  const { error } = await admin
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
