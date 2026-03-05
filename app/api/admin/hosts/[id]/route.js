import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { getOverrideSession } from '@/lib/get-override-session'
import { notifyHost } from '@/lib/notify-host'

export async function GET(_req, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: host } = await adminClient
    .from('hosts')
    .select('*, users(id, email, full_name, is_active, created_at)')
    .eq('id', id)
    .single()

  if (!host) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: listings } = await adminClient
    .from('listings')
    .select('id, title, city, state, type, is_active, status, rating, review_count, price_per_night, created_at')
    .eq('host_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const listingIds = (listings ?? []).map(l => l.id)
  let stats = { count: 0, revenue: 0 }
  let recentBookings = []

  if (listingIds.length > 0) {
    const { data: bookings } = await adminClient
      .from('bookings')
      .select('id, total_amount, status, check_in, check_out, created_at, listing_id')
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false })

    if (bookings?.length) {
      const confirmed = bookings.filter(b => b.status === 'confirmed')
      stats.count   = confirmed.length
      stats.revenue = confirmed.reduce((s, b) => s + (parseFloat(b.total_amount) || 0), 0)
      recentBookings = bookings.slice(0, 3)
    }
  }

  return NextResponse.json({ host, listings: listings ?? [], stats, recentBookings })
}

const SUSPENSION_CATEGORIES = [
  'fraud', 'policy_violation', 'spam', 'safety', 'payment_abuse', 'other',
]

const REINSTATE_ROLES = ['super_admin', 'trust_safety']
const MANAGE_ROLES    = ['admin', 'super_admin', 'trust_safety']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, reason, suspension_category, admin_notes, subject, message_body, message_type } = body

  const validActions = ['verify', 'suspend', 'reactivate', 'message', 'grant_snap_verified', 'revoke_snap_verified']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Check override session
  const overrideSession = await getOverrideSession(user.id)
  const isOverride = !!overrideSession

  // Role gates
  if (action === 'grant_snap_verified' || action === 'revoke_snap_verified') {
    if (role !== 'super_admin' && !isOverride) {
      return NextResponse.json(
        { error: 'Only Super Admin can grant or revoke the SnapReserve Verified Host badge.' },
        { status: 403 }
      )
    }
  } else if (action === 'reactivate') {
    if (!REINSTATE_ROLES.includes(role) && !isOverride) {
      return NextResponse.json(
        { error: 'Only Trust & Safety or Super Admin can reinstate accounts.' },
        { status: 403 }
      )
    }
  } else if (action !== 'message' && !MANAGE_ROLES.includes(role)) {
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
  if (action === 'message') {
    if (!subject?.trim()) return NextResponse.json({ error: 'subject required' }, { status: 400 })
    if (!message_body?.trim()) return NextResponse.json({ error: 'message body required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()

  const { data: host } = await adminClient
    .from('hosts')
    .select('*')
    .eq('id', id)
    .single()

  if (!host) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  }

  // Block protected owner account (suspend/reactivate affect the user row)
  if (action === 'suspend') {
    const { data: hostUser } = await adminClient
      .from('users').select('is_owner').eq('id', host.user_id).maybeSingle()
    if (hostUser?.is_owner) {
      return NextResponse.json({ error: 'This account is protected and cannot be modified.' }, { status: 403 })
    }
  }

  // Handle message action
  if (action === 'message') {
    await notifyHost({
      hostUserId:  host.user_id,
      listingId:   null,
      type:        message_type ?? 'info',
      subject:     subject.trim(),
      body:        message_body.trim(),
    })
    await logAction({
      actorId:    user.id,
      actorEmail: user.email,
      actorRole:  role,
      action:     'host.message',
      targetType: 'host',
      targetId:   id,
      beforeData: null,
      afterData:  { subject: subject.trim(), type: message_type ?? 'info' },
      ipAddress:  ip,
      userAgent:  ua,
    })
    return NextResponse.json({ success: true })
  }

  const now = new Date().toISOString()
  let hostUpdate = {}
  let userUpdate = {}

  if (action === 'grant_snap_verified') {
    hostUpdate.is_snap_verified = true
    hostUpdate.snap_verified_at = now
    hostUpdate.snap_verified_by = user.id
  } else if (action === 'revoke_snap_verified') {
    hostUpdate.is_snap_verified = false
    hostUpdate.snap_verified_at = null
    hostUpdate.snap_verified_by = null
  } else if (action === 'verify') {
    hostUpdate.verification_status = 'verified'
  } else if (action === 'suspend') {
    const suspensionReason = reason?.trim() || suspension_category
    hostUpdate.suspended_at         = now
    hostUpdate.suspension_reason    = suspensionReason
    hostUpdate.suspension_category  = suspension_category
    hostUpdate.admin_notes          = admin_notes.trim()
    userUpdate.suspended_at         = now
    userUpdate.suspension_reason    = suspensionReason
    userUpdate.suspension_category  = suspension_category
    userUpdate.admin_notes          = admin_notes.trim()
    userUpdate.is_active            = false
  } else if (action === 'reactivate') {
    hostUpdate.suspended_at         = null
    hostUpdate.suspension_reason    = null
    hostUpdate.suspension_category  = null
    hostUpdate.admin_notes          = null
    userUpdate.suspended_at         = null
    userUpdate.suspension_reason    = null
    userUpdate.suspension_category  = null
    userUpdate.admin_notes          = null
    userUpdate.is_active            = true
  }

  const { error: hostUpdateError } = await adminClient
    .from('hosts')
    .update(hostUpdate)
    .eq('id', id)

  if (hostUpdateError) {
    return NextResponse.json({ error: hostUpdateError.message }, { status: 500 })
  }

  if (Object.keys(userUpdate).length > 0) {
    await adminClient
      .from('users')
      .update(userUpdate)
      .eq('id', host.user_id)
  }

  // Sync host_snap_verified flag on all listings for this host
  if (action === 'grant_snap_verified' || action === 'revoke_snap_verified') {
    await adminClient
      .from('listings')
      .update({ host_snap_verified: action === 'grant_snap_verified' })
      .eq('host_id', id)
  }

  // Disable/re-enable listings
  if (action === 'suspend') {
    await adminClient
      .from('listings')
      .update({ is_active: false, status: 'suspended' })
      .eq('host_id', id)
      .neq('status', 'deleted')

    const categoryLabels = {
      fraud: 'Fraud or suspicious activity', policy_violation: 'Policy violation',
      spam: 'Spam or fake listings', safety: 'Safety issue',
      payment_abuse: 'Payment abuse', other: 'Policy violation',
    }
    await notifyHost({
      hostUserId: host.user_id,
      listingId:  null,
      type:       'suspension',
      subject:    'Your host account has been suspended',
      body:       `Your SnapReserve host account has been suspended.\n\nReason: ${categoryLabels[suspension_category] ?? suspension_category}\n\nAll your active listings have been temporarily disabled.\n\nIf you believe this is a mistake, you can submit an appeal from your dashboard.\n\nFor assistance, contact support@snapreserve.app.`,
    })
  } else if (action === 'reactivate') {
    // Re-enable previously-suspended listings
    await adminClient
      .from('listings')
      .update({ is_active: true, status: 'approved' })
      .eq('host_id', id)
      .eq('status', 'suspended')

    await notifyHost({
      hostUserId: host.user_id,
      listingId:  null,
      type:       'reactivation',
      subject:    'Your host account has been reinstated',
      body:       'Your SnapReserve host account has been reviewed and reinstated. Your listings have been re-enabled and you can resume hosting.',
    })
  }

  await logAction({
    actorId:        user.id,
    actorEmail:     user.email,
    actorRole:      role,
    action:         `host.${action}`,
    targetType:     'host',
    targetId:       id,
    beforeData:     host,
    afterData:      { ...host, ...hostUpdate },
    ipAddress:      ip,
    userAgent:      ua,
    adminNotes:     admin_notes?.trim() ?? null,
    isOverride,
    overrideReason: overrideSession?.reason ?? null,
  })

  return NextResponse.json({ success: true })
}
