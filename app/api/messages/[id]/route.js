import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

async function getConvForUser(admin, id, userId) {
  const { data } = await admin
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()
  if (!data) return null

  // Direct guest or primary host
  if (data.guest_user_id === userId || data.host_user_id === userId) return data

  // Team member access (not Finance)
  const { data: membership } = await admin
    .from('host_team_members')
    .select('host_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership || membership.role === 'finance') return null

  // Verify this conversation belongs to the user's org
  const { data: hostRow } = await admin
    .from('hosts').select('user_id').eq('id', membership.host_id).maybeSingle()

  if (hostRow?.user_id === data.host_user_id) {
    return { ...data, _isTeamMember: true }
  }

  return null
}

// GET — fetch thread + messages, mark incoming as read
export async function GET(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const conv = await getConvForUser(admin, id, user.id)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await admin
    .from('direct_messages')
    .select('id, sender_id, body, is_read, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // Mark incoming as read + reset unread count for this user
  const isGuest = conv.guest_user_id === user.id
  await admin
    .from('direct_messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  await admin
    .from('conversations')
    .update(isGuest ? { guest_unread_count: 0 } : { host_unread_count: 0 })
    .eq('id', id)

  return NextResponse.json({ conversation: conv, messages: messages || [], userId: user.id })
}

// POST — send a message
export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const msgBody = body.message?.trim()
  if (!msgBody) return NextResponse.json({ error: 'message is required' }, { status: 400 })
  if (msgBody.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

  const admin = createAdminClient()

  const conv = await getConvForUser(admin, id, user.id)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (conv.status === 'blocked') {
    return NextResponse.json({ error: 'This conversation has been blocked.' }, { status: 403 })
  }

  const isGuest = conv.guest_user_id === user.id
  const now = new Date().toISOString()

  const { data: msg, error } = await admin
    .from('direct_messages')
    .insert({ conversation_id: id, sender_id: user.id, body: msgBody })
    .select('id, sender_id, body, is_read, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update conversation metadata + increment other party's unread
  await admin.from('conversations').update({
    last_message_at:      now,
    last_message_preview: msgBody.slice(0, 100),
    updated_at:           now,
    ...(isGuest
      ? { host_unread_count:  (conv.host_unread_count  || 0) + 1 }
      : { guest_unread_count: (conv.guest_unread_count || 0) + 1 }),
  }).eq('id', id)

  // ── Email notification stub ──────────────────────────────────────────────
  // const recipientId = isGuest ? conv.host_user_id : conv.guest_user_id
  // await sendEmail({ userId: recipientId, subject: 'New message on SnapReserve™', body: msgBody })
  // ────────────────────────────────────────────────────────────────────────

  return NextResponse.json(msg)
}

// PATCH — block / unblock / archive
export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await request.json()

  const admin = createAdminClient()
  const conv = await getConvForUser(admin, id, user.id)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isHost = conv.host_user_id === user.id || !!conv._isTeamMember

  if (action === 'block') {
    if (!isHost) return NextResponse.json({ error: 'Only the host can block a user.' }, { status: 403 })
    await admin.from('conversations').update({ status: 'blocked', blocked_by: user.id }).eq('id', id)
  } else if (action === 'unblock') {
    if (!isHost) return NextResponse.json({ error: 'Only the host can unblock.' }, { status: 403 })
    await admin.from('conversations').update({ status: 'active', blocked_by: null }).eq('id', id)
  } else if (action === 'archive') {
    await admin.from('conversations').update({ status: 'archived' }).eq('id', id)
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
