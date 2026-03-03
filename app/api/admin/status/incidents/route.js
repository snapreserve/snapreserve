import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, impact, message, affected_components } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const validImpacts = ['none', 'minor', 'major', 'critical']
  if (!validImpacts.includes(impact)) return NextResponse.json({ error: 'Invalid impact' }, { status: 400 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: incident, error: incidentErr } = await admin
    .from('status_incidents')
    .insert({
      title: title.trim(),
      status: 'investigating',
      impact,
      message: message?.trim() ?? null,
      affected_components: affected_components ?? [],
      created_by: user.id,
    })
    .select()
    .single()

  if (incidentErr) return NextResponse.json({ error: incidentErr.message }, { status: 500 })

  // Create first timeline update
  if (message?.trim()) {
    await admin.from('status_incident_updates').insert({
      incident_id: incident.id,
      status: 'investigating',
      message: message.trim(),
      created_by: user.id,
    })
  }

  // Mark affected components as degraded if currently operational
  if (affected_components?.length) {
    await admin
      .from('status_components')
      .update({ status: 'degraded', updated_at: now })
      .in('id', affected_components)
      .eq('status', 'operational')
  }

  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: 'status_incident.create',
    targetType: 'status_incident', targetId: incident.id,
    afterData: incident,
    ipAddress: ip, userAgent: ua,
  })

  return NextResponse.json({ success: true, incident })
}
