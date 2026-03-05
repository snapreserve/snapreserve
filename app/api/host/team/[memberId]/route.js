import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// Helper: verify caller is the org owner for a given host_team_members row
async function getOrgOwner(admin, userId) {
  const { data } = await admin.from('hosts').select('id').eq('user_id', userId).maybeSingle()
  return data?.id || null
}

// PATCH /api/host/team/[memberId]  { action: 'change_role', role }  or  { action: 'remove' }
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await params
  const body = await request.json().catch(() => ({}))
  const { action, role } = body

  if (!['change_role', 'remove', 'resend_invite', 'set_property_access'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ownerHostId = await getOrgOwner(admin, user.id)
  if (!ownerHostId) {
    return NextResponse.json({ error: 'Only the organisation owner can manage members' }, { status: 403 })
  }

  // Fetch the target member row
  const { data: member } = await admin
    .from('host_team_members')
    .select('id, host_id, user_id, role, status, invite_token, invite_email, allowed_listing_ids')
    .eq('id', memberId)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.host_id !== ownerHostId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot modify the organisation owner' }, { status: 400 })
  }

  if (action === 'change_role') {
    if (!['manager', 'staff', 'finance', 'custom'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const { custom_role_id } = body
    if (role === 'custom' && !custom_role_id) {
      return NextResponse.json({ error: 'custom_role_id is required for custom role' }, { status: 400 })
    }
    const { error } = await admin
      .from('host_team_members')
      .update({ role, custom_role_id: role === 'custom' ? custom_role_id : null })
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'remove') {
    const { error } = await admin
      .from('host_team_members')
      .update({ status: 'removed', removed_at: new Date().toISOString() })
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'resend_invite') {
    if (member.status !== 'pending') {
      return NextResponse.json({ error: 'Can only resend to pending invites' }, { status: 400 })
    }
    // Regenerate token
    const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const { error } = await admin
      .from('host_team_members')
      .update({ invite_token: newToken, invited_at: new Date().toISOString() })
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({ success: true, invite_link: `${appUrl}/team/join?token=${newToken}` })
  }

  if (action === 'set_property_access') {
    const { listing_id, allow } = body
    if (!listing_id) return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })

    let newIds
    const current = member.allowed_listing_ids // null = all listings

    if (allow) {
      // Granting access: add to the restricted list (or null → already has all, no-op)
      if (current === null) return NextResponse.json({ success: true }) // already has full access
      newIds = [...new Set([...current, listing_id])]
    } else {
      // Revoking access
      if (current === null) {
        // Expand from "all" to "all except this one"
        const { data: allListings } = await admin
          .from('listings')
          .select('id')
          .eq('host_id', ownerHostId)
          .is('deleted_at', null)
        const allIds = (allListings || []).map(l => l.id)
        newIds = allIds.filter(id => id !== listing_id)
      } else {
        newIds = current.filter(id => id !== listing_id)
      }
    }

    // If newIds covers all listings, reset to null (full access) to keep it clean
    if (allow === true && current !== null) {
      const { data: allListings } = await admin
        .from('listings')
        .select('id')
        .eq('host_id', ownerHostId)
        .is('deleted_at', null)
      const allIds = new Set((allListings || []).map(l => l.id))
      const newSet = new Set(newIds)
      if ([...allIds].every(id => newSet.has(id))) newIds = null // full access restored
    }

    const { error } = await admin
      .from('host_team_members')
      .update({ allowed_listing_ids: newIds ?? null })
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
}

// DELETE /api/host/team/[memberId]  — shorthand for remove
export async function DELETE(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await params
  const admin = createAdminClient()

  const ownerHostId = await getOrgOwner(admin, user.id)
  if (!ownerHostId) {
    return NextResponse.json({ error: 'Only the organisation owner can remove members' }, { status: 403 })
  }

  const { data: member } = await admin
    .from('host_team_members')
    .select('id, host_id, role')
    .eq('id', memberId)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.host_id !== ownerHostId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the organisation owner' }, { status: 400 })
  }

  const { error } = await admin
    .from('host_team_members')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
