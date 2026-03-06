import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { notifyHost } from '@/lib/notify-host'

const ALLOWED_ROLES = ['admin', 'super_admin']

export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { action, rejection_reason, rejection_subject, rejection_body } = body

  if (!['approve', 'reject', 'save_notes'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }
  if (action === 'reject' && !rejection_reason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Save admin notes — no role restriction beyond admin+
  if (action === 'save_notes') {
    const { notes } = body
    await admin.from('host_applications').update({ id_admin_notes: notes ?? null }).eq('id', id)
    return NextResponse.json({ success: true })
  }

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
    const { error: hostsErr } = await admin
      .from('hosts')
      .upsert(
        {
          user_id:             app.user_id,
          host_status:         'active',
          host_type:           app.host_type || null,
          display_name:        app.display_name || null,
          verification_status: 'unverified',
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )
    if (hostsErr) {
      console.error('[host-application.approve] hosts upsert failed:', hostsErr.message)
      return NextResponse.json({ error: `Failed to create host profile: ${hostsErr.message}` }, { status: 500 })
    }

    // Seed the owner row in host_team_members (idempotent)
    const { data: newHost } = await admin.from('hosts').select('id').eq('user_id', app.user_id).maybeSingle()
    if (newHost) {
      const { error: teamErr } = await admin.from('host_team_members').upsert(
        {
          host_id:     newHost.id,
          user_id:     app.user_id,
          role:        'owner',
          status:      'active',
          accepted_at: new Date().toISOString(),
        },
        { onConflict: 'host_id,user_id', ignoreDuplicates: true }
      )
      if (teamErr) console.error('[host-application.approve] host_team_members upsert failed:', teamErr.message)
    }

    // Notify applicant of approval
    const firstName = app.display_name?.split(' ')[0] || 'there'
    await notifyHost({
      hostUserId: app.user_id,
      type:       'info',
      subject:    '🎉 You\'re approved — welcome to SnapReserve™!',
      body:       `Hi ${firstName},\n\nGreat news! Your identity has been verified and your host account is now active. You can start creating and publishing listings immediately.\n\nWelcome to the SnapReserve™ host community!`,
    }).catch(err => console.error('[host-application.approve] notify failed:', err.message))

    await logAction({
      actorId:    user.id,
      actorEmail: user.email,
      actorRole:  role,
      action:     'host_application.approved',
      targetType: 'host_application',
      targetId:   id,
      afterData:  { user_id: app.user_id, host_type: app.host_type, display_name: app.display_name, status: 'approved' },
    })

    return NextResponse.json({ success: true, status: 'approved' })
  }

  // ── Reject ──────────────────────────────────────────────────────
  const { error: rejErr } = await admin
    .from('host_applications')
    .update({
      status:           'rejected',
      reviewed_by:      user.id,
      reviewed_at:      new Date().toISOString(),
      rejection_reason: rejection_reason.trim(),
    })
    .eq('id', id)
  if (rejErr) return NextResponse.json({ error: rejErr.message }, { status: 500 })

  // Reset user role back to 'user'
  await admin
    .from('users')
    .update({ user_role: 'user' })
    .eq('id', app.user_id)

  // Send rejection message to applicant's Messages inbox
  const firstName = app.display_name?.split(' ')[0] || 'there'
  const msgSubject = rejection_subject || 'Your host application — update from SnapReserve™'
  const msgBody = rejection_body ||
    `Hi ${firstName},\n\nWe've reviewed your host application and unfortunately we're unable to approve it at this time.\n\nReason: ${rejection_reason.trim()}\n\nIf you have questions or would like to provide additional information, please reply to this message — our team will get back to you within 24 hours.`

  await notifyHost({
    hostUserId: app.user_id,
    type:       'rejection',
    subject:    msgSubject,
    body:       msgBody,
  }).catch(err => console.error('[host-application.reject] notify failed:', err.message))

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     'host_application.rejected',
    targetType: 'host_application',
    targetId:   id,
    afterData:  { user_id: app.user_id, rejection_reason: rejection_reason.trim(), status: 'rejected' },
  })

  return NextResponse.json({ success: true, status: 'rejected' })
}
