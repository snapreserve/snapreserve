import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET() {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()

  const [
    { data: leads, count: total },
    { data: byCountry },
    { data: trend },
  ] = await Promise.all([
    adminClient
      .from('international_leads')
      .select('id, email, country, role, source, created_at', { count: 'exact' })
      .order('created_at', { ascending: false }),

    // Country breakdown
    adminClient.rpc('intl_leads_by_country').then(r => r.error
      ? adminClient
          .from('international_leads')
          .select('country')
          .order('country')
      : r
    ),

    // Last 30 days trend (day buckets)
    adminClient
      .from('international_leads')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true }),
  ])

  // Build country counts manually (RPC might not exist)
  const countryCounts = {}
  for (const l of leads ?? []) {
    countryCounts[l.country] = (countryCounts[l.country] || 0) + 1
  }
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  // Build 30-day trend (group by day)
  const trendMap = {}
  for (const l of trend ?? []) {
    const day = l.created_at.slice(0, 10)
    trendMap[day] = (trendMap[day] || 0) + 1
  }
  const trendData = Object.entries(trendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  return NextResponse.json({
    leads:        leads ?? [],
    total:        total ?? 0,
    topCountries,
    trend:        trendData,
  })
}
