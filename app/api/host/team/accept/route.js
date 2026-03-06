import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

const ROLE_PERMS = {
  manager: ['Edit listings', 'Manage bookings', 'View earnings & reports', 'Reply to guest reviews'],
  staff:   ['View upcoming bookings', 'Manage check-in calendar', 'Send guest messages'],
  finance: ['View earnings & payouts', 'Export financial reports', 'View booking revenue'],
  custom:  ['Permissions defined by your host'],
}

// GET /api/host/team/accept?token=xxx
// Public — validates invite token and returns all details the join page needs.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('host_team_members')
    .select('id, host_id, role, status, invite_email, invited_at, accepted_at, allowed_listing_ids')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  if (invite.status === 'active')   return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 })
  if (invite.status === 'removed')  return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })

  // Expiry check (7 days)
  const invitedAt = new Date(invite.invited_at)
  const expiresAt = new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    return NextResponse.json({ error: 'This invite link has expired. Ask the owner to resend it.' }, { status: 410 })
  }

  // Fetch host org info + owner profile
  const { data: host } = await admin
    .from('hosts')
    .select('display_name, user_id')
    .eq('id', invite.host_id)
    .maybeSingle()

  let hostOwnerName = null
  let hostAvatarUrl = null
  if (host?.user_id) {
    const { data: ownerProfile } = await admin
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', host.user_id)
      .maybeSingle()
    hostOwnerName = ownerProfile?.full_name || null
    hostAvatarUrl = ownerProfile?.avatar_url || null
  }

  // Resolve assigned listing names (if access is restricted)
  let assignedListings = []
  if (Array.isArray(invite.allowed_listing_ids) && invite.allowed_listing_ids.length > 0) {
    const { data: listings } = await admin
      .from('listings')
      .select('id, title, city, state')
      .in('id', invite.allowed_listing_ids)
    assignedListings = listings || []
  }

  return NextResponse.json({
    valid:             true,
    invite_id:         invite.id,
    role:              invite.role,
    invite_email:      invite.invite_email,
    org_name:          host?.display_name || 'a SnapReserve™ organisation',
    host_owner_name:   hostOwnerName,
    host_avatar_url:   hostAvatarUrl,
    permissions:       ROLE_PERMS[invite.role] || [],
    // null = all properties; array = specific listings
    all_properties:    !Array.isArray(invite.allowed_listing_ids),
    assigned_listings: assignedListings,
    expires_at:        expiresAt.toISOString(),
  })
}

// POST /api/host/team/accept
// Two flows:
//  action: 'create_and_accept' — brand-new user; creates account + accepts (no session needed)
//  (default)                   — existing user accepts using their logged-in session
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { token, action } = body

  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  const admin = createAdminClient()

  // ── Shared: validate token ──────────────────────────────────────────────
  const { data: invite } = await admin
    .from('host_team_members')
    .select('id, host_id, role, status, invite_email, user_id, invited_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  if (invite.status === 'active')  return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 })
  if (invite.status === 'removed') return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 })

  const expiresAt = new Date(new Date(invite.invited_at).getTime() + 7 * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  // ── Flow A: create a brand-new restricted team account ──────────────────
  if (action === 'create_and_accept') {
    const { full_name, password } = body

    if (!invite.invite_email) {
      return NextResponse.json({ error: 'Cannot create account — no email on this invite' }, { status: 400 })
    }
    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if account already exists
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', invite.invite_email.toLowerCase())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Log in to accept the invite.' },
        { status: 409 }
      )
    }

    // Create Supabase auth user (email already confirmed — no email verification needed)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email:         invite.invite_email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    })

    if (authErr || !authData?.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create account' }, { status: 500 })
    }

    const newUserId = authData.user.id

    // Upsert users row — is_team_member: true restricts booking access
    // approval_status: 'approved' lets them through the waitlist gate to reach the host portal
    await admin.from('users').upsert({
      id:              newUserId,
      email:           invite.invite_email.toLowerCase(),
      full_name:       full_name.trim(),
      is_host:         true,
      is_team_member:  true,
      approval_status: 'approved',
      is_verified:     false,
      is_active:       true,
    }, { onConflict: 'id', ignoreDuplicates: false })

    // Accept the invite
    const { error: updateErr } = await admin
      .from('host_team_members')
      .update({
        user_id:      newUserId,
        status:       'active',
        accepted_at:  new Date().toISOString(),
        invite_token: null,
      })
      .eq('id', invite.id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ success: true, role: invite.role, host_id: invite.host_id, created: true })
  }

  // ── Flow B: existing user accepts using their session ───────────────────
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'You must be logged in to accept this invite' }, { status: 401 })

  // Email match check
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

  // Check not already an active member
  const { data: existing } = await admin
    .from('host_team_members')
    .select('id')
    .eq('host_id', invite.host_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'You are already a member of this organisation' }, { status: 409 })
  }

  // Accept
  const { error: updateErr } = await admin
    .from('host_team_members')
    .update({
      user_id:      user.id,
      status:       'active',
      accepted_at:  new Date().toISOString(),
      invite_token: null,
    })
    .eq('id', invite.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Grant host portal access + bypass waitlist gate for the host portal
  await admin.from('users').update({
    is_host:         true,
    is_team_member:  true,
    approval_status: 'approved',
  }).eq('id', user.id)

  return NextResponse.json({ success: true, role: invite.role, host_id: invite.host_id })
}
