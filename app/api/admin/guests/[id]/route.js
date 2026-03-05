import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { getOverrideSession } from '@/lib/get-override-session'
import { notifyUser } from '@/lib/notify-user'

export async function GET(_req, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const [{ data: guest }, { data: bookings }, { data: auditLogs }] = await Promise.all([
    admin.from('users').select('*').eq('id', id).single(),
    admin
      .from('bookings')
      .select(`
        id, status, check_in, check_out, guests, nights,
        total_amount, payment_status, payment_provider, created_at,
        listings(id, title, city, state, type),
        host:users!bookings_host_id_fkey(id, full_name, email)
      `)
      .eq('guest_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    admin
      .from('audit_logs')
      .select('id, action, actor_email, created_at, admin_notes')
      .eq('target_id', id)
      .eq('target_type', 'user')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ guest, bookings: bookings ?? [], auditLogs: auditLogs ?? [] })
}

const SUSPENSION_CATEGORIES = [
  'fraud', 'policy_violation', 'spam', 'safety', 'payment_abuse', 'other',
]

// Roles that can reinstate suspended accounts
const REINSTATE_ROLES = ['super_admin', 'trust_safety']
// Roles that can suspend/deactivate
const MANAGE_ROLES    = ['admin', 'super_admin', 'trust_safety']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, suspension_category, admin_notes, reason } = body

  const validActions = ['suspend', 'deactivate', 'reactivate', 'approve_account', 'reject_account', 'verify_user', 'unverify_user']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  // Approval actions — handled inline, skip rest of flow
  if (action === 'approve_account') {
    if (!['support', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const adminClient = createAdminClient()
    await adminClient.from('users').update({ approval_status: 'approved' }).eq('id', id)
    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'guest.approve_account', targetType: 'user', targetId: id,
      ipAddress: ip, userAgent: ua,
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'reject_account') {
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const adminClient = createAdminClient()
    await adminClient.from('users').update({ approval_status: 'rejected' }).eq('id', id)
    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'guest.reject_account', targetType: 'user', targetId: id,
      ipAddress: ip, userAgent: ua,
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'verify_user') {
    if (!['support', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const adminClient = createAdminClient()
    await adminClient.from('users').update({ verification_status: 'verified' }).eq('id', id)
    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'guest.verify_user', targetType: 'user', targetId: id,
      ipAddress: ip, userAgent: ua,
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'unverify_user') {
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const adminClient = createAdminClient()
    await adminClient.from('users').update({ verification_status: 'pending' }).eq('id', id)
    await logAction({
      actorId: user.id, actorEmail: user.email, actorRole: role,
      action: 'guest.unverify_user', targetType: 'user', targetId: id,
      ipAddress: ip, userAgent: ua,
    })
    return NextResponse.json({ success: true })
  }

  // Check override session for privilege escalation
  const overrideSession = await getOverrideSession(user.id)
  const isOverride = !!overrideSession

  // Role gates
  if (action === 'reactivate') {
    if (!REINSTATE_ROLES.includes(role) && !isOverride) {
      return NextResponse.json(
        { error: 'Only Trust & Safety or Super Admin can reinstate accounts.' },
        { status: 403 }
      )
    }
  } else if (!MANAGE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validation
  if (action === 'suspend') {
    if (!suspension_category || !SUSPENSION_CATEGORIES.includes(suspension_category)) {
      return NextResponse.json({ error: 'Valid suspension_category required' }, { status: 400 })
    }
    if (!admin_notes?.trim()) {
      return NextResponse.json({ error: 'admin_notes required' }, { status: 400 })
    }
  }
  if (action === 'deactivate' && !admin_notes?.trim()) {
    return NextResponse.json({ error: 'admin_notes required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: guest } = await adminClient
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (!guest) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Block protected owner account
  if (guest.is_owner && action !== 'reactivate') {
    return NextResponse.json({ error: 'This account is protected and cannot be modified.' }, { status: 403 })
  }

  const now = new Date().toISOString()
  let updatePayload = {}

  if (action === 'suspend') {
    updatePayload.suspended_at         = now
    updatePayload.suspension_reason    = reason?.trim() || suspension_category
    updatePayload.suspension_category  = suspension_category
    updatePayload.admin_notes          = admin_notes.trim()
    updatePayload.is_active            = false
  } else if (action === 'deactivate') {
    updatePayload.deleted_at           = now
    updatePayload.deletion_reason      = admin_notes?.trim() || reason
    updatePayload.admin_notes          = admin_notes?.trim() || null
    updatePayload.is_active            = false
  } else if (action === 'reactivate') {
    updatePayload.suspended_at         = null
    updatePayload.suspension_reason    = null
    updatePayload.suspension_category  = null
    updatePayload.admin_notes          = null
    updatePayload.deleted_at           = null
    updatePayload.deletion_reason      = null
    updatePayload.is_active            = true
  }

  const { error: updateError } = await adminClient
    .from('users')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // If the user is also a host, disable/re-enable their listings
  if (action === 'suspend' || action === 'deactivate') {
    const { data: hostRow } = await adminClient
      .from('hosts').select('id').eq('user_id', id).maybeSingle()
    if (hostRow) {
      await adminClient
        .from('listings')
        .update({ is_active: false, status: 'suspended' })
        .eq('host_id', hostRow.id)
        .neq('status', 'deleted')
      // Also suspend the hosts row
      await adminClient
        .from('hosts')
        .update({ suspended_at: now, suspension_reason: updatePayload.suspension_reason ?? 'account_action' })
        .eq('id', hostRow.id)
    }
  } else if (action === 'reactivate') {
    const { data: hostRow } = await adminClient
      .from('hosts').select('id').eq('user_id', id).maybeSingle()
    if (hostRow) {
      await adminClient
        .from('hosts')
        .update({ suspended_at: null, suspension_reason: null })
        .eq('id', hostRow.id)
      // Re-enable previously-approved listings
      await adminClient
        .from('listings')
        .update({ is_active: true, status: 'approved' })
        .eq('host_id', hostRow.id)
        .eq('status', 'suspended')
    }
  }

  // Notify the user
  if (action === 'suspend') {
    const categoryLabels = {
      fraud: 'Fraud or suspicious activity', policy_violation: 'Policy violation',
      spam: 'Spam or fake listings', safety: 'Safety issue',
      payment_abuse: 'Payment abuse', other: 'Policy violation',
    }
    await notifyUser({
      userId:  id,
      type:    'suspension',
      subject: 'Your account has been suspended',
      body:    `Your SnapReserve account has been suspended.\n\nReason: ${categoryLabels[suspension_category] ?? suspension_category}\n\nIf you believe this is a mistake, you can submit an appeal from your account dashboard.\n\nFor further assistance, contact support@snapreserve.app.`,
    })
  } else if (action === 'reactivate') {
    await notifyUser({
      userId:  id,
      type:    'reactivation',
      subject: 'Your account has been reinstated',
      body:    'Your SnapReserve account has been reviewed and reinstated. You can now log in and continue using the platform.',
    })
  }

  await logAction({
    actorId:        user.id,
    actorEmail:     user.email,
    actorRole:      role,
    action:         `guest.${action}`,
    targetType:     'user',
    targetId:       id,
    beforeData:     guest,
    afterData:      { ...guest, ...updatePayload },
    ipAddress:      ip,
    userAgent:      ua,
    adminNotes:     admin_notes?.trim() ?? null,
    isOverride,
    overrideReason: overrideSession?.reason ?? null,
  })

  return NextResponse.json({ success: true })
}
