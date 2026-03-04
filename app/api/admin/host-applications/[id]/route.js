import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'

const ALLOWED_ROLES = ['admin', 'super_admin']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { action, rejection_reason } = body

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 })
  }
  if (action === 'reject' && !rejection_reason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch the application
  const { data: app, error: appErr } = await admin
    .from('host_applications')
    .select('id, user_id, status, display_name, host_type')
    .eq('id', id)
    .maybeSingle()

  if (appErr || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (app.status !== 'pending') {
    return NextResponse.json({ error: `Application is already ${app.status}.` }, { status: 400 })
  }

  if (action === 'approve') {
    // Update application status
    const { error: updErr } = await admin
      .from('host_applications')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Promote user to host
    const { error: userErr } = await admin
      .from('users')
      .update({ user_role: 'host', is_host: true })
      .eq('id', app.user_id)
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

    // Create hosts row (idempotent — upsert on user_id)
    await admin
      .from('hosts')
      .upsert(
        {
          user_id: app.user_id,
          host_status: 'active',
          host_type: app.host_type || null,
          display_name: app.display_name || null,
          verification_status: 'unverified',
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )

    await logAction({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      action: 'host_application.approved',
      targetType: 'host_application',
      targetId: id,
      afterData: { user_id: app.user_id, host_type: app.host_type, display_name: app.display_name, status: 'approved' },
    })

    return NextResponse.json({ success: true, status: 'approved' })
  }

  // Reject
  const { error: rejErr } = await admin
    .from('host_applications')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejection_reason.trim(),
    })
    .eq('id', id)
  if (rejErr) return NextResponse.json({ error: rejErr.message }, { status: 500 })

  // Reset user role back to 'user'
  await admin
    .from('users')
    .update({ user_role: 'user' })
    .eq('id', app.user_id)

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: role,
    action: 'host_application.rejected',
    targetType: 'host_application',
    targetId: id,
    afterData: { user_id: app.user_id, rejection_reason: rejection_reason.trim(), status: 'rejected' },
  })

  return NextResponse.json({ success: true, status: 'rejected' })
}
