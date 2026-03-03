import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const admin = createAdminClient()

  const [{ data: components }, { data: incidents }] = await Promise.all([
    admin
      .from('status_components')
      .select('id, name, slug, description, status, updated_at')
      .order('display_order', { ascending: true }),
    admin
      .from('status_incidents')
      .select(`
        id, title, status, impact, message, affected_components,
        created_at, updated_at, resolved_at,
        status_incident_updates (
          id, status, message, created_at
        )
      `)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false }),
  ])

  // Compute overall system status
  const statuses = (components ?? []).map(c => c.status)
  let overall = 'operational'
  if (statuses.includes('major_outage'))     overall = 'major_outage'
  else if (statuses.includes('partial_outage')) overall = 'partial_outage'
  else if (statuses.includes('degraded'))    overall = 'degraded'
  else if (statuses.includes('maintenance')) overall = 'maintenance'

  return NextResponse.json(
    { overall, components: components ?? [], incidents: incidents ?? [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  )
}
