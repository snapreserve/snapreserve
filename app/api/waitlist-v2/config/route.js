import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
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
