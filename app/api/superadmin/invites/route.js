import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { headers } from 'next/headers'

const BASE_URL = 'https://snapreserve.app'

export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role: inviteRole } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  if (!['admin', 'support'].includes(inviteRole)) {
    return NextResponse.json({ error: 'role must be admin or support' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: invite, error: insertError } = await adminClient
    .from('admin_invites')
    .insert({
      email:      email.toLowerCase().trim(),
      role:       inviteRole,
      created_by: user.id,
    })
    .select('id, token, email, role, expires_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const link = `${BASE_URL}/admin/accept-invite?token=${invite.token}`

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     'invite.created',
    targetType: 'admin_invite',
    targetId:   invite.id,
    afterData:  { email: invite.email, role: invite.role },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ token: invite.token, link, expires_at: invite.expires_at })
}

export async function GET() {
  const { role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data: invites, error: fetchError } = await adminClient
    .from('admin_invites')
    .select('id, token, email, role, created_at, expires_at, accepted_at, revoked_at')
    .order('created_at', { ascending: false })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const now = new Date()
  const enriched = (invites ?? []).map(inv => {
    let status = 'pending'
    if (inv.revoked_at) status = 'revoked'
    else if (inv.accepted_at) status = 'accepted'
    else if (new Date(inv.expires_at) < now) status = 'expired'
    return { ...inv, status, link: `${BASE_URL}/admin/accept-invite?token=${inv.token}` }
  })

  return NextResponse.json({ invites: enriched })
}
