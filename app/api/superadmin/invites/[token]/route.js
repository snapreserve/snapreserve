import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET — validate token (public, no auth required)
export async function GET(request, { params }) {
  const { token } = await params

  const adminClient = createAdminClient()
  const { data: invite } = await adminClient
    .from('admin_invites')
    .select('id, token, email, role, expires_at, accepted_at, revoked_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
  }

  if (invite.revoked_at) {
    return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  return NextResponse.json({ invite: { email: invite.email, role: invite.role, expires_at: invite.expires_at } })
}

// POST — accept invite (authenticated user must match invite email)
export async function POST(request, { params }) {
  const { token } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to accept an invite' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: invite } = await adminClient
    .from('admin_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
  }
  if (invite.revoked_at) {
    return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Email must match
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({
      error: `This invite is for ${invite.email}. You are signed in as ${user.email}.`,
    }, { status: 403 })
  }

  const now = new Date().toISOString()

  // Upsert admin_roles (unique on user_id + role)
  const { error: roleError } = await adminClient
    .from('admin_roles')
    .upsert(
      { user_id: user.id, role: invite.role, is_active: true, granted_at: now, granted_by: invite.created_by },
      { onConflict: 'user_id,role' }
    )

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  // Mark invite accepted
  await adminClient
    .from('admin_invites')
    .update({ accepted_at: now, accepted_by: user.id })
    .eq('id', invite.id)

  const h = await headers()
  await logAction({
    actorId:    invite.created_by,
    actorEmail: invite.email,
    actorRole:  'super_admin',
    action:     'invite.accepted',
    targetType: 'admin_invite',
    targetId:   invite.id,
    afterData:  { email: user.email, role: invite.role },
    ipAddress:  h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    userAgent:  h.get('user-agent') ?? 'unknown',
  })

  return NextResponse.json({ success: true, role: invite.role })
}
