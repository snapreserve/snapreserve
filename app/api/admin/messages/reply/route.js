import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { notifyHost } from '@/lib/notify-host'
import { hasPermission } from '@/lib/admin-permissions'

/**
 * POST /api/admin/messages/reply
 * Body: { message_id: string, body: string }
 * Sends a new message to the host (as a reply to the given message). Creates a new host_messages
 * row and emails the host via notifyHost.
 */
export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error === 'mfa_required') return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!hasPermission(role, 'messaging', 'send')) {
    return NextResponse.json({ error: 'You do not have permission to send messages' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const messageId = body.message_id
  const replyBody = body.body?.trim()

  if (!messageId) return NextResponse.json({ error: 'message_id is required' }, { status: 400 })
  if (!replyBody) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: msg } = await admin
    .from('host_messages')
    .select('id, host_user_id, listing_id, subject')
    .eq('id', messageId)
    .single()

  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  const subject = msg.subject?.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject || 'Your message'}`
  await notifyHost({
    hostUserId: msg.host_user_id,
    listingId:  msg.listing_id ?? undefined,
    type:       'info',
    subject,
    body:       replyBody,
  })

  return NextResponse.json({ success: true })
}
