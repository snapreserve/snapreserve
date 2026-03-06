import { redirect } from 'next/navigation'
import { getConnectOnboardingUrl } from '@/lib/stripe-connect'
import { APP_ENV } from '@/lib/env'

// GET — Stripe redirects here when the onboarding link has expired.
//       Regenerates a fresh link and redirects the host to continue.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account')

  if (!accountId) {
    redirect('/host/dashboard?connect=error')
  }

  try {
    const { url } = await getConnectOnboardingUrl({
      hostUserId:      null, // account already exists, no need to pass hostUserId
      stripeAccountId: accountId,
    })
    console.log(`[SnapReserve™] Connect link refreshed for account ${accountId} (${APP_ENV})`)
    redirect(url)
  } catch (err) {
    console.error(`[SnapReserve™] Connect refresh error (${APP_ENV}):`, err.message)
    redirect('/host/dashboard?connect=error')
  }
}
