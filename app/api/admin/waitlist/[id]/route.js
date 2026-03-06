import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

const ADMIN_ROLES = ['admin', 'super_admin']

export async function GET(req, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (!role) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: entry, error: entryErr } = await supabase
    .from('waitlist_v2_signups')
    .select('*')
    .eq('id', id)
    .single()
  if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 404 })

  const { data: notes } = await supabase
    .from('waitlist_admin_notes')
    .select('*')
    .eq('entry_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ entry, notes: notes ?? [] })
}

export async function PATCH(req, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (!role) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { action } = body

  const hdrs = await headers()
  const ip  = hdrs.get('x-forwarded-for') ?? 'unknown'
  const ua  = hdrs.get('user-agent') ?? ''

  const supabase = createAdminClient()

  // Fetch current entry for audit before-state
  const { data: current } = await supabase
    .from('waitlist_v2_signups')
    .select('*')
    .eq('id', id)
    .single()
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let update = {}
  let auditAction = `waitlist.${action}`

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
      break

    case 'unset_founder_eligible':
      if (!ADMIN_ROLES.includes(role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      update = { founder_eligible: false }
      break

    case 'assign_founder':
      if (!ADMIN_ROLES.includes(role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      update = {
        founder_assigned: true,
        founder_eligible: true,
        status: 'founder_assigned',
        founder_region:      body.founder_region ?? current.founder_region,
        founder_spot_number: body.founder_spot_number ?? current.founder_spot_number,
      }
      auditAction = 'waitlist.founder_assign'
      break

    case 'revoke_founder':
      if (!ADMIN_ROLES.includes(role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      update = {
        founder_assigned: false,
        founder_region: null,
        founder_spot_number: null,
        status: 'approved',
      }
      auditAction = 'waitlist.founder_revoke'
      break

    case 'update_notes':
      update = { admin_notes: body.admin_notes ?? null }
      break

    case 'update_fields':
      const allowed = ['first_name','last_name','email','city','state','country','role','property_type']
      for (const k of allowed) {
        if (body[k] !== undefined) update[k] = body[k]
      }
      break

    default:
      return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  const { data: updated, error: updErr } = await supabase
    .from('waitlist_v2_signups')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: auditAction,
    targetType: 'waitlist_entry',
    targetId: id,
    beforeData: current,
    afterData: updated,
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ entry: updated })
}
