import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { hasPermission } from '@/lib/admin-permissions'
import { sendEmail, ticketClosedEmailHtml } from '@/lib/send-email'

/**
 * PATCH /api/admin/messages/[id]
 * Body: { action: 'close' | 'reopen' }
 * Close or reopen a host message (ticket). Requires admin with messaging view.
 * When closing, the host is emailed that the ticket has been closed.
 */
export async function PATCH(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error === 'mfa_required') return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!hasPermission(role, 'messaging', 'view')) {
    return NextResponse.json({ error: 'You do not have permission to manage messages' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body.action

  if (action !== 'close' && action !== 'reopen') {
    return NextResponse.json({ error: 'action must be "close" or "reopen"' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: msg } = await admin
    .from('host_messages')
    .select('id, host_user_id, subject')
    .eq('id', id)
    .single()

  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  const now = new Date().toISOString()
  const payload = action === 'close'
    ? { closed_at: now, closed_by: user.id }
    : { closed_at: null, closed_by: null }

  const { error: updateError } = await admin
    .from('host_messages')
    .update(payload)
    .eq('id', id)

  if (updateError) {
    if (updateError.message?.includes('closed_at') || updateError.message?.includes('closed_by')) {
      return NextResponse.json(
        { error: 'Close/reopen is not available yet. Run the database migration that adds closed_at and closed_by to host_messages (see supabase/migrations/20250310_host_messages_closed.sql).' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // When closing, notify the host by email so they know the ticket is closed and can't reply
  if (action === 'close' && msg.host_user_id) {
    const { data: hostUser } = await admin
      .from('users')
      .select('email')
      .eq('id', msg.host_user_id)
      .single()
    const hostEmail = hostUser?.email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://snapreserve.app'
    const messagesUrl = `${baseUrl}/host/dashboard`
    if (hostEmail) {
      const { error: emailErr } = await sendEmail({
        to: hostEmail,
        subject: `Support ticket closed: ${(msg.subject || 'Your message').slice(0, 60)}`,
        html: ticketClosedEmailHtml({
          subject: msg.subject || 'Your support request',
          messagesUrl,
        }),
      })
      if (emailErr) console.error('[admin/messages] ticket-closed email failed:', emailErr)
    }
  }

  return NextResponse.json({
    success: true,
    closed_at: payload.closed_at,
    closed_by: payload.closed_by,
  })
}
