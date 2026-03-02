import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, rejection_reason } = body

  const validActions = ['approve', 'reject', 'request_changes', 'soft_delete']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'reject' && !rejection_reason?.trim()) {
    return NextResponse.json({ error: 'rejection_reason required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: listing } = await adminClient
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  let updatePayload = { reviewed_by: user.id, reviewed_at: now }
  let approvalUpdate = {}

  if (action === 'approve') {
    updatePayload.status = 'approved'
    updatePayload.is_active = true
    approvalUpdate = { status: 'approved', reviewed_at: now }
  } else if (action === 'reject') {
    updatePayload.status = 'rejected'
    updatePayload.is_active = false
    updatePayload.rejection_reason = rejection_reason
    approvalUpdate = { status: 'rejected', reviewed_at: now, rejection_reason }
  } else if (action === 'request_changes') {
    updatePayload.status = 'changes_requested'
    updatePayload.is_active = false
    approvalUpdate = { status: 'changes_requested', reviewed_at: now }
  } else if (action === 'soft_delete') {
    updatePayload.deleted_at = now
    updatePayload.is_active = false
  }

  const { error: updateError } = await adminClient
    .from('listings')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Sync listing_approvals if needed
  if (Object.keys(approvalUpdate).length > 0) {
    await adminClient
      .from('listing_approvals')
      .update(approvalUpdate)
      .eq('listing_id', id)
      .eq('status', 'pending')
  }

  // Update host's listing_status
  if (action === 'approve') {
    await adminClient
      .from('users')
      .update({ listing_status: 'approved', is_verified: true })
      .eq('id', listing.host_id)
  } else if (action === 'reject') {
    await adminClient
      .from('users')
      .update({ listing_status: 'rejected' })
      .eq('id', listing.host_id)
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: `listing.${action}`,
    targetType: 'listing',
    targetId: id,
    beforeData: listing,
    afterData: { ...listing, ...updatePayload },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
