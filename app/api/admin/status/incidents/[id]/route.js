import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

const VALID_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status, message } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Update message required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: incident } = await admin
    .from('status_incidents')
    .select('*')
    .eq('id', id)
    .single()

  if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })

  const updatePayload = {
    status,
    message: message.trim(),
    updated_at: now,
    ...(status === 'resolved' ? { resolved_at: now } : {}),
  }

  const { error: updateErr } = await admin
    .from('status_incidents')
    .update(updatePayload)
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Append timeline update
  await admin.from('status_incident_updates').insert({
    incident_id: id,
    status,
    message: message.trim(),
    created_by: user.id,
  })

  // If resolved, restore affected components to operational
  if (status === 'resolved' && incident.affected_components?.length) {
    await admin
      .from('status_components')
      .update({ status: 'operational', updated_at: now })
      .in('id', incident.affected_components)
  }

  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: `status_incident.${status}`,
    targetType: 'status_incident', targetId: id,
    beforeData: { status: incident.status },
    afterData: { status },
    ipAddress: ip, userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
