import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { notifyHost } from '@/lib/notify-host'
import { sendEmail, listingChangesRequestedEmailHtml } from '@/lib/send-email'

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, rejection_reason, reason, notes } = body

  const validActions = ['approve', 'reject', 'request_changes', 'soft_delete', 'suspend', 'reactivate', 'reject_permanently', 'edit', 'set_editors_pick']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'edit' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can edit listings directly' }, { status: 403 })
  }
  if (action === 'set_editors_pick' && !['admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Only Admin or Super Admin can set Editor\'s Pick' }, { status: 403 })
  }
  if (action === 'set_editors_pick' && typeof body.editors_pick !== 'boolean') {
    return NextResponse.json({ error: 'editors_pick must be true or false' }, { status: 400 })
  }
  if (action === 'reject' && !rejection_reason?.trim()) {
    return NextResponse.json({ error: 'rejection_reason required' }, { status: 400 })
  }
  if (action === 'request_changes' && !notes?.trim()) {
    return NextResponse.json({ error: 'notes required for request_changes' }, { status: 400 })
  }
  if (action === 'suspend' && !body.reason?.trim()) {
    return NextResponse.json({ error: 'reason required for suspend' }, { status: 400 })
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

  // Resolve host's user_id from hosts.id (listings.host_id → hosts.id, not users.id)
  let hostUserId = null
  if (listing.host_id) {
    const { data: hostRow } = await adminClient
      .from('hosts').select('user_id').eq('id', listing.host_id).maybeSingle()
    hostUserId = hostRow?.user_id ?? null
  }

  const now = new Date().toISOString()
  let updatePayload = { reviewed_by: user.id, reviewed_at: now }
  let approvalUpdate = {}

  if (action === 'approve') {
    updatePayload.status    = 'live'
    updatePayload.is_active = true   // auto-publish on approval — no "Go Live" step needed
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
  } else if (action === 'suspend') {
    updatePayload.suspended_at = now
    updatePayload.suspension_reason = reason
    updatePayload.is_active = false
    updatePayload.status = 'suspended'
  } else if (action === 'reactivate') {
    updatePayload.suspended_at = null
    updatePayload.suspension_reason = null
    updatePayload.host_explanation = null
    updatePayload.host_explanation_at = null
    updatePayload.is_active = true
    updatePayload.status = 'approved'
  } else if (action === 'reject_permanently') {
    updatePayload.is_active = false
    updatePayload.status = 'rejected'
  } else if (action === 'edit') {
    const EDITABLE = [
      'title', 'description', 'price_per_night', 'cleaning_fee',
      'max_guests', 'bedrooms', 'bathrooms', 'city', 'state', 'country',
      'property_type', 'property_subcategory', 'min_nights', 'house_rules', 'amenities',
    ]
    const fields = body.fields ?? {}
    EDITABLE.forEach(f => {
      if (f in fields) updatePayload[f] = fields[f]
    })
  } else if (action === 'set_editors_pick') {
    updatePayload.editors_pick = body.editors_pick
  }

  const { error: updateError } = await adminClient
    .from('listings')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Save change request notes for host to see
  if (action === 'request_changes') {
    await adminClient.from('listing_change_requests').insert({
      listing_id:  id,
      admin_id:    user.id,
      admin_email: user.email,
      notes:       notes.trim(),
      status:      'open',
    })
    // In-app message so host sees it in dashboard
    await adminClient.from('host_messages').insert({
      host_user_id: hostUserId,
      listing_id:   id,
      type:         'warning',
      subject:      'Changes requested for your listing',
      body:         `Our team has requested changes to your listing "${listing.title}".\n\n${notes.trim()}\n\nEdit your listing to make the updates and resubmit for review.`,
    })
    // Email with clear "Edit your listing" link
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(hostUserId)
      const hostEmail = authUser?.user?.email
      if (hostEmail) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
        const editUrl = `${baseUrl}/list-property?edit=${id}`
        await sendEmail({
          to:      hostEmail,
          subject: 'Changes requested for your listing',
          html:    listingChangesRequestedEmailHtml({
            listingTitle: listing.title,
            notes:        notes.trim(),
            editUrl,
          }),
          text:    `Our team has requested changes to your listing "${listing.title}".\n\n${notes.trim()}\n\nEdit your listing: ${editUrl}`,
        })
      }
    } catch (err) {
      console.error('[admin/listings] request_changes email failed:', err.message)
    }
  }

  // Sync listing_approvals if needed
  if (Object.keys(approvalUpdate).length > 0) {
    await adminClient
      .from('listing_approvals')
      .update(approvalUpdate)
      .eq('listing_id', id)
  }

  // Notify host for suspension / reactivation / permanent rejection
  if (action === 'suspend') {
    await notifyHost({
      hostUserId,
      listingId:  id,
      type:       'suspension',
      subject:    `Your listing has been suspended`,
      body:       `Your listing "${listing.title}" has been suspended.\n\nReason: ${reason}\n\nYou may submit an explanation from your host dashboard.`,
    })
  } else if (action === 'reactivate') {
    await notifyHost({
      hostUserId,
      listingId:  id,
      type:       'reactivation',
      subject:    `Your listing has been reactivated`,
      body:       `Your listing "${listing.title}" has been reviewed and reactivated. You can go live again from your host dashboard.`,
    })
  } else if (action === 'reject_permanently') {
    await notifyHost({
      hostUserId,
      listingId:  id,
      type:       'rejection',
      subject:    `Your listing has been permanently removed`,
      body:       `Your listing "${listing.title}" has been permanently removed from SnapReserve™ following a policy review.\n\nPlease contact support if you have questions.`,
    })
  }

  // Update host's listing_status (use hostUserId — listings.host_id is hosts.id, not users.id)
  if (hostUserId) {
    if (action === 'approve') {
      await adminClient
        .from('users')
        .update({ listing_status: 'approved', is_verified: true })
        .eq('id', hostUserId)
    } else if (action === 'reject') {
      await adminClient
        .from('users')
        .update({ listing_status: 'rejected' })
        .eq('id', hostUserId)
    }
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

  // Append to listing_change_history (non-blocking)
  try {
    await adminClient.from('listing_change_history').insert({
      listing_id:    id,
      action,
      actor_id:      user.id,
      actor_email:   user.email,
      actor_role:    role,
      reason:        notes ?? reason ?? rejection_reason ?? null,
      before_status: listing.status ?? null,
      after_status:  updatePayload.status ?? listing.status ?? null,
    })
  } catch (histErr) {
    console.error('[listing-history] insert failed:', histErr)
  }

  return NextResponse.json({ success: true })
}
