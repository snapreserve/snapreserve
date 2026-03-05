import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/host/team/accept?token=xxx
// Validates an invite token and returns invite details (public — no auth required)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('host_team_members')
    .select('id, host_id, role, status, invite_email, invited_at, accepted_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  if (invite.status === 'active') return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 })
  if (invite.status === 'removed') return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })

  // Check expiry (7 days)
  const invitedAt = new Date(invite.invited_at)
  const expiresAt = new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    return NextResponse.json({ error: 'This invite link has expired. Ask the owner to resend it.' }, { status: 410 })
  }

  // Fetch org name
  const { data: host } = await admin
    .from('hosts')
    .select('display_name, users(email)')
    .eq('id', invite.host_id)
    .maybeSingle()

  return NextResponse.json({
    valid: true,
    invite_id: invite.id,
    role: invite.role,
    invite_email: invite.invite_email,
    org_name: host?.display_name || 'a SnapReserve organisation',
    expires_at: expiresAt.toISOString(),
  })
}

// POST /api/host/team/accept  { token }
// Accepts an invite. Caller must be logged in and their email must match the invite.
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'You must be logged in to accept an invite' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { token } = body
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('host_team_members')
    .select('id, host_id, role, status, invite_email, user_id, invited_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  if (invite.status === 'active') return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 })
  if (invite.status === 'removed') return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })

  // Expiry check
  const expiresAt = new Date(new Date(invite.invited_at).getTime() + 7 * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // Email match check — only if an invite_email was specified
  if (invite.invite_email) {
    const { data: userProfile } = await admin
      .from('users')
      .select('email')
      .eq('id', user.id)
      .maybeSingle()
    const userEmail = userProfile?.email || user.email
    if (userEmail.toLowerCase() !== invite.invite_email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.invite_email}. Please log in with that account.` },
        { status: 403 }
      )
    }
  }

  // Check this user isn't already an active member
  const { data: existing } = await admin
    .from('host_team_members')
    .select('id, status')
    .eq('host_id', invite.host_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'You are already a member of this organisation' }, { status: 409 })
  }

  // Accept the invite
  const { error: updateErr } = await admin
    .from('host_team_members')
    .update({
      user_id:      user.id,
      status:       'active',
      accepted_at:  new Date().toISOString(),
      invite_token: null, // consume the token
    })
    .eq('id', invite.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Mark as a host member without changing user_role — team members stay as regular
  // users so they can browse as guests freely. Host portal access is granted via
  // the active host_team_members record (checked in /host/layout.js).
  await admin
    .from('users')
    .update({ is_host: true })
    .eq('id', user.id)

  return NextResponse.json({ success: true, role: invite.role, host_id: invite.host_id })
}
