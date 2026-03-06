import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

export async function PATCH(req, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (!['admin', 'super_admin'].includes(role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for') ?? 'unknown'
  const ua = hdrs.get('user-agent') ?? ''

  const supabase = createAdminClient()
  const allowed = ['region_tag', 'launch_priority', 'founder_potential', 'admin_notes']
  const update = {}
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const { data, error: updErr } = await supabase
    .from('international_leads')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'intl_lead.update',
    targetType: 'international_lead',
    targetId: id,
    afterData: update,
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ lead: data })
}
