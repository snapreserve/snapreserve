import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

const VALID_STATUSES = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json()

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  const { data: before } = await admin
    .from('status_components')
    .select('*')
    .eq('id', id)
    .single()

  if (!before) return NextResponse.json({ error: 'Component not found' }, { status: 404 })

  const { data, error: updateErr } = await admin
    .from('status_components')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await logAction({
    actorId: user.id, actorEmail: user.email, actorRole: role,
    action: 'status_component.update',
    targetType: 'status_component', targetId: id,
    beforeData: { status: before.status },
    afterData: { status },
    ipAddress: ip, userAgent: ua,
  })

  return NextResponse.json({ success: true, component: data })
}
