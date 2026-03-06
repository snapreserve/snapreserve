export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import IntlLeadsClient from './IntlLeadsClient'

async function getData() {
  const adminClient = createAdminClient()
  const [
    { data: leads, count: total },
    { data: expansion },
  ] = await Promise.all([
    adminClient
      .from('international_leads')
      .select('id, email, country, role, source, region_tag, launch_priority, founder_potential, admin_notes, created_at', { count: 'exact' })
      .order('created_at', { ascending: false }),
    adminClient
      .from('country_expansion')
      .select('*')
      .order('priority_rank', { ascending: true, nullsFirst: false }),
  ])

  // Build country counts + trend
  const countryCounts = {}
  const trendMap = {}
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  for (const l of leads ?? []) {
    countryCounts[l.country] = (countryCounts[l.country] || 0) + 1
    if (l.created_at >= cutoff) {
      const day = l.created_at.slice(0, 10)
      trendMap[day] = (trendMap[day] || 0) + 1
    }
  }

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => ({ country, count }))

  const trend = Object.entries(trendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  return {
    leads:     leads ?? [],
    total:     total ?? 0,
    topCountries,
    trend,
    expansion: expansion ?? [],
  }
}

export default async function IntlLeadsPage() {
  const { role, error } = await getAdminSession()
  if (error || !role) redirect('/login')

  const data = await getData()
  const canEdit = ['admin', 'super_admin'].includes(role)

  return <IntlLeadsClient {...data} canEdit={canEdit} />
}
