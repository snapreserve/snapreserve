import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { isConnectAccountReady } from '@/lib/stripe-connect'
import { APP_ENV } from '@/lib/env'

// GET — Stripe redirects the host here after completing Connect onboarding
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account')

  if (!accountId) {
    redirect('/host/dashboard?connect=error')
  }

  try {
    const ready = await isConnectAccountReady(accountId)
    console.log(`[SnapReserve] Connect return: account ${accountId} ready=${ready} (${APP_ENV})`)

    if (ready) {
      const admin = createAdminClient()
      await admin
        .from('hosts')
        .update({ payout_status: 'active' })
        .eq('stripe_connect_account_id', accountId)

      redirect('/host/dashboard?connect=success')
    } else {
      // Onboarding started but not finished (host may need to add more details)
      redirect('/host/dashboard?connect=pending')
    }
  } catch (err) {
    console.error(`[SnapReserve] Connect return error (${APP_ENV}):`, err.message)
    redirect('/host/dashboard?connect=error')
  }
}
