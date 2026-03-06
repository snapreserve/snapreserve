import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

export async function GET(req) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data, error: dbErr } = await supabase
    .from('user_invites')
    .select('*')
    .order('created_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const now = new Date()
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
  const invites = (data ?? []).map(inv => {
    let status = inv.status
    if (status === 'pending' && new Date(inv.expires_at) < now) status = 'expired'
    return { ...inv, status, link: `${BASE_URL}/join?token=${inv.token}` }
  })

  return NextResponse.json({ invites })
}

export async function POST(req) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { email, name, invite_type, region, waitlist_entry_id } = await req.json()
  if (!email?.trim() || !email.includes('@')) return NextResponse.json({ error: 'valid_email_required' }, { status: 400 })

  const hdrs = await headers()
  const ip  = hdrs.get('x-forwarded-for') ?? 'unknown'
  const ua  = hdrs.get('user-agent') ?? ''

  const supabase = createAdminClient()

  const { data: inv, error: insErr } = await supabase
    .from('user_invites')
    .insert({
      email:             email.trim().toLowerCase(),
      name:              name?.trim() || null,
      invite_type:       invite_type || 'host',
      region:            region?.trim() || null,
      waitlist_entry_id: waitlist_entry_id || null,
      sent_by:           user.id,
      sent_by_name:      user.email,
    })
    .select()
    .single()

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
  const link = `${BASE_URL}/join?token=${inv.token}`

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'user_invite.create',
    targetType: 'user_invite',
    targetId: inv.id,
    afterData: { email: inv.email, invite_type: inv.invite_type, region: inv.region },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ invite: inv, link, expires_at: inv.expires_at })
}
