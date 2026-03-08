import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail, teamInviteEmailHtml, teamInviteEmailText } from '@/lib/send-email'

// GET /api/host/team
// Returns the org (host) team members for the current user.
// Works for org owners AND org members (returns the org they belong to).
// Supports both cookie-based auth (web) and Bearer token auth (mobile).
export async function GET(request) {
  const admin = createAdminClient()

  // Try Bearer token first (mobile), fall back to cookie session (web)
  let user = null
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (token) {
    const { data: { user: u } } = await admin.auth.getUser(token)
    user = u || null
  }
  if (!user) {
    const session = await getUserSession()
    user = session.user
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Is this user a host (owner)?
  const { data: hostRow } = await admin
    .from('hosts')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  let hostId = hostRow?.id || null

  // If not an owner, check if they're an active team member of someone else's org
  if (!hostId) {
    const { data: membership } = await admin
      .from('host_team_members')
      .select('host_id, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (membership) hostId = membership.host_id
  }

  if (!hostId) {
    return NextResponse.json({ error: 'No host organisation found' }, { status: 404 })
  }

  // Fetch all members (owner first, then by joined date)
  const { data: members, error } = await admin
    .from('host_team_members')
    .select('id, host_id, user_id, role, custom_role_id, status, invite_email, invited_at, accepted_at, allowed_listing_ids')
    .eq('host_id', hostId)
    .neq('status', 'removed')
    .order('invited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with user profile data
  const enriched = await Promise.all(
    (members || []).map(async (m) => {
      if (!m.user_id) return { ...m, full_name: null, email: m.invite_email }
      const { data: profile } = await admin
        .from('users')
        .select('full_name, email')
        .eq('id', m.user_id)
        .maybeSingle()
      return { ...m, full_name: profile?.full_name || null, email: profile?.email || m.invite_email }
    })
  )

  // Determine caller's role in this org
  const callerMember = (members || []).find((m) => m.user_id === user.id)
  const callerRole = callerMember?.role || (hostRow ? 'owner' : null)

  return NextResponse.json({
    host_id: hostId,
    host_name: hostRow?.display_name || null,
    caller_role: callerRole,
    members: enriched,
  })
}

// POST /api/host/team
// Invite a new team member. Caller must be the org owner.
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { email, role, custom_role_id, allowed_listing_ids } = body

  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (!['manager', 'staff', 'finance', 'custom'].includes(role)) {
    return NextResponse.json({ error: 'Role must be manager, staff, finance, or custom' }, { status: 400 })
  }
  if (role === 'custom' && !custom_role_id) {
    return NextResponse.json({ error: 'custom_role_id is required for custom role' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Caller must be the host (owner)
  const { data: hostRow } = await admin
    .from('hosts')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!hostRow) {
    return NextResponse.json({ error: 'Only the organization owner can invite members' }, { status: 403 })
  }

  const hostId = hostRow.id
  const inviteEmail = email.trim().toLowerCase()

  // Look up the invitee's user record (may not exist yet)
  const { data: inviteeUser } = await admin
    .from('users')
    .select('id')
    .eq('email', inviteEmail)
    .maybeSingle()

  // Check if already a member (active or pending)
  if (inviteeUser) {
    const { data: existing } = await admin
      .from('host_team_members')
      .select('id, status')
      .eq('host_id', hostId)
      .eq('user_id', inviteeUser.id)
      .neq('status', 'removed')
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: existing.status === 'pending' ? 'Invite already sent to this user' : 'User is already a team member' },
        { status: 409 }
      )
    }
  }

  // Check if email already has a pending invite
  const { data: existingEmail } = await admin
    .from('host_team_members')
    .select('id, status')
    .eq('host_id', hostId)
    .eq('invite_email', inviteEmail)
    .neq('status', 'removed')
    .maybeSingle()
  if (existingEmail) {
    return NextResponse.json({ error: 'An invite has already been sent to this email' }, { status: 409 })
  }

  // Generate invite token
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  const { data: member, error: insertErr } = await admin
    .from('host_team_members')
    .insert({
      host_id:             hostId,
      user_id:             inviteeUser?.id || null,
      role,
      custom_role_id:      role === 'custom' ? custom_role_id : null,
      allowed_listing_ids: Array.isArray(allowed_listing_ids) && allowed_listing_ids.length > 0 ? allowed_listing_ids : null,
      status:              'pending',
      invite_email:        inviteEmail,
      invite_token:        token,
      invited_by:          user.id,
    })
    .select('id, invite_token')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteLink = `${appUrl}/team/join?token=${token}`

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const orgName   = hostRow.display_name || 'a SnapReserve™ organisation'

  // In-app message if invitee already has an account
  if (inviteeUser) {
    await admin.from('host_messages').insert({
      host_user_id: inviteeUser.id,
      type:         'info',
      subject:      `You've been invited to join ${orgName}`,
      body:         `You have been invited as a **${role}** to manage listings for ${orgName}.\n\nAccept invite: ${inviteLink}`,
    }).catch(() => {})
  }

  // Email invitation (works for both existing and new users)
  await sendEmail({
    to:      inviteEmail,
    subject: `You've been invited to join ${orgName} on SnapReserve™`,
    html:    teamInviteEmailHtml({ inviteeEmail: inviteEmail, orgName, role, inviteLink, expiresAt }),
    text:    teamInviteEmailText({ inviteeEmail: inviteEmail, orgName, role, inviteLink, expiresAt }),
  })

  return NextResponse.json({ success: true, invite_link: inviteLink, member_id: member.id })
}
