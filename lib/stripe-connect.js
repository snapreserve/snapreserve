/**
 * Stripe Connect Express helpers for SnapReserve™ host payouts.
 *
 * Uses the env-validated stripe client from lib/stripe.js — so Connect accounts
 * are automatically test accounts in staging and live accounts in production.
 * No separate guard needed here: if a live key were used in staging, lib/stripe.js
 * would have already thrown at startup.
 */

import stripe from './stripe'
import { APP_URL, APP_ENV } from './env'

/**
 * Creates a new Stripe Connect Express account (or resumes an existing one)
 * and returns a one-time onboarding URL.
 *
 * @param {{ hostUserId: string, stripeAccountId?: string }} opts
 * @returns {{ accountId: string, url: string }}
 */
export async function getConnectOnboardingUrl({ hostUserId, stripeAccountId }) {
  let accountId = stripeAccountId

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: {
        snapreserve_host_id: hostUserId,
        environment:         APP_ENV,
      },
    })
    accountId = account.id
  }

  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: `${APP_URL}/api/host/stripe-connect/refresh?account=${accountId}`,
    return_url:  `${APP_URL}/api/host/stripe-connect/return?account=${accountId}`,
    type:        'account_onboarding',
  })

  return { accountId, url: accountLink.url }
}

/**
 * Checks whether a Connect account has completed onboarding
 * (charges_enabled + payouts_enabled).
 *
 * @param {string} accountId
 * @returns {Promise<boolean>}
 */
export async function isConnectAccountReady(accountId) {
  const account = await stripe.accounts.retrieve(accountId)
  return account.charges_enabled && account.payouts_enabled
}
