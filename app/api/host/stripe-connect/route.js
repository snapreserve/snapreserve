import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'
import { getConnectOnboardingUrl } from '@/lib/stripe-connect'
import { APP_ENV } from '@/lib/env'

// POST — initiate or resume Stripe Connect Express onboarding for a host
export async function POST() {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify the user is a host
  const { data: host } = await admin
    .from('hosts')
    .select('id, stripe_connect_account_id, payout_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!host) return NextResponse.json({ error: 'Host account not found' }, { status: 404 })

  try {
    const { accountId, url } = await getConnectOnboardingUrl({
      hostUserId:      user.id,
      stripeAccountId: host.stripe_connect_account_id,
    })

    // Persist the account ID if it was just created
    if (!host.stripe_connect_account_id) {
      await admin
        .from('hosts')
        .update({ stripe_connect_account_id: accountId, payout_status: 'pending' })
        .eq('id', host.id)
    }

    console.log(`[SnapReserve™] Stripe Connect initiated for host ${user.id} (${APP_ENV})`)
    return NextResponse.json({ url })
  } catch (err) {
    console.error(`[SnapReserve™] Stripe Connect error (${APP_ENV}):`, err.message)
    return NextResponse.json({ error: 'Could not start Connect onboarding.' }, { status: 500 })
  }
}
