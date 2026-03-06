import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

const ADMIN_ROLES = ['admin', 'super_admin']

export async function POST(req) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (!role) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { ids, action } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids_required' }, { status: 400 })

  const hdrs = await headers()
  const ip  = hdrs.get('x-forwarded-for') ?? 'unknown'
  const ua  = hdrs.get('user-agent') ?? ''

  const supabase = createAdminClient()

  let update = {}
  let auditAction = `waitlist.bulk_${action}`

  switch (action) {
    case 'approve':
      update = { status: 'approved' }
      break
    case 'reject':
      update = { status: 'rejected' }
      break
    case 'remove':
      update = { status: 'removed', removed_at: new Date().toISOString() }
      break
    case 'set_founder_eligible':
      if (!ADMIN_ROLES.includes(role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      update = { founder_eligible: true }
      auditAction = 'waitlist.bulk_founder_eligible'
      break
    default:
      return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  const { data, error: updErr } = await supabase
    .from('waitlist_v2_signups')
    .update(update)
    .in('id', ids)
    .select('id')

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: auditAction,
    targetType: 'waitlist_entry',
    afterData: { ids, action, count: data?.length ?? 0 },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ affected: data?.length ?? 0 })
}
