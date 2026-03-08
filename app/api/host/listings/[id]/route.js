import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'

export async function PATCH(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { action } = body

  if (!['go_live', 'unpublish', 'resubmit', 'submit_explanation', 'update_policies', 'send_followup'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('id, host_id, status, is_active, suspension_reason')
    .eq('id', id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // listings.host_id → hosts.id — verify ownership or active team membership
  const { data: hostRow } = await admin
    .from('hosts').select('user_id').eq('id', listing.host_id).maybeSingle()

  let callerRole = null
  if (hostRow?.user_id === user.id) {
    callerRole = 'owner'
  } else {
    const { data: membership } = await admin
      .from('host_team_members')
      .select('role')
      .eq('host_id', listing.host_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (membership) callerRole = membership.role
  }

  if (!callerRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Role gates: manager actions require owner or manager
  const managerOnlyActions = ['go_live', 'unpublish', 'resubmit', 'submit_explanation', 'update_policies']
  if (managerOnlyActions.includes(action) && !['owner', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  // send_followup: owner, manager, staff allowed; finance cannot
  if (action === 'send_followup' && callerRole === 'finance') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  let updatePayload = {}

  if (action === 'go_live') {
    if (listing.status !== 'approved') {
      return NextResponse.json({ error: 'Listing must be approved before going live' }, { status: 400 })
    }
    updatePayload = { status: 'live', is_active: true }
  } else if (action === 'unpublish') {
    if (listing.status !== 'live') {
      return NextResponse.json({ error: 'Only live listings can be unpublished' }, { status: 400 })
    }
    updatePayload = { status: 'approved', is_active: false }
  } else if (action === 'submit_explanation') {
    if (listing.status !== 'suspended') {
      return NextResponse.json({ error: 'Only suspended listings can submit an explanation' }, { status: 400 })
    }
    const explanation = body.explanation?.trim()
    if (!explanation) return NextResponse.json({ error: 'explanation is required' }, { status: 400 })

    updatePayload = {
      host_explanation:    explanation,
      host_explanation_at: new Date().toISOString(),
      status:              'pending_reapproval',
    }

    // Re-open any related reports so they resurface in the admin queue
    const { data: relatedReports } = await admin
      .from('reports')
      .select('id')
      .eq('target_id', id)
      .eq('target_type', 'listing')
      .in('status', ['under_review', 'escalated'])

    if (relatedReports?.length) {
      const now = new Date().toISOString()
      for (const rep of relatedReports) {
        await admin.from('reports').update({ status: 'open', updated_at: now }).eq('id', rep.id)
        await admin.from('report_activity').insert({
          report_id:   rep.id,
          actor_id:    user.id,
          actor_email: user.email,
          action:      'host_submitted_explanation',
          detail:      explanation.slice(0, 120),
        }).catch(() => {})
      }
    }
  } else if (action === 'update_policies') {
    const {
      checkin_start_time, checkin_end_time, checkout_time,
      cancellation_policy, pet_policy, smoking_policy,
      quiet_hours_start, quiet_hours_end,
      security_deposit, min_booking_age, extra_guest_fee,
      cleaning_fee, house_rules,
    } = body
    if (!checkin_start_time || !checkout_time) {
      return NextResponse.json({ error: 'checkin_start_time and checkout_time are required' }, { status: 400 })
    }
    updatePayload = {
      checkin_start_time,
      checkin_end_time:    checkin_end_time    || null,
      checkout_time,
      cancellation_policy: cancellation_policy || 'flexible',
      pet_policy:          pet_policy          || 'no_pets',
      smoking_policy:      smoking_policy      || 'no_smoking',
      quiet_hours_start:   quiet_hours_start   || null,
      quiet_hours_end:     quiet_hours_end     || null,
      security_deposit:    security_deposit    ? parseFloat(security_deposit)  : 0,
      min_booking_age:     min_booking_age     ? parseInt(min_booking_age)     : 18,
      extra_guest_fee:     extra_guest_fee     ? parseFloat(extra_guest_fee)   : 0,
      cleaning_fee:        cleaning_fee != null ? parseFloat(cleaning_fee)     : undefined,
      house_rules:         house_rules         || null,
    }
    // remove undefined keys
    Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k])
  } else if (action === 'send_followup') {
    if (!['pending_review', 'pending'].includes(listing.status)) {
      return NextResponse.json({ error: 'Follow-ups can only be sent for listings under review' }, { status: 400 })
    }
    const message = body.message?.trim()
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })
    if (message.length > 1000) return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 })

    const { error: fuErr } = await admin.from('listing_follow_ups').insert({
      listing_id:   id,
      host_user_id: user.id,
      message,
    })
    if (fuErr) return NextResponse.json({ error: fuErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } else if (action === 'resubmit') {
    if (listing.status !== 'changes_requested') {
      return NextResponse.json({ error: 'Only listings with changes requested can be resubmitted' }, { status: 400 })
    }
    // Resolve all open change requests
    await admin
      .from('listing_change_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('listing_id', id)
      .eq('status', 'open')
    // Put the approval back in the queue
    await admin
      .from('listing_approvals')
      .update({ status: 'pending', reviewed_at: null })
      .eq('listing_id', id)
      .eq('status', 'changes_requested')
    updatePayload = { status: 'pending_review', is_active: false }
  }

  const { error } = await admin.from('listings').update(updatePayload).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
