import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(request) {
  // Rate limit: 30 requests per IP per minute (prevents scraping)
  const ip = getClientIp(request)
  const rl = rateLimit(`waitlist-config:${ip}`, 30, 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('platform_settings')
      .select('key, value')
      .in('key', ['intl_leads_enabled', 'waitlist_v2_enabled'])

    const settings = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
    return NextResponse.json({
      intl_leads_enabled:    settings.intl_leads_enabled    === true,
      waitlist_v2_enabled:   settings.waitlist_v2_enabled   === true,
    })
  } catch {
    return NextResponse.json({ intl_leads_enabled: false, waitlist_v2_enabled: false })
  }
}
