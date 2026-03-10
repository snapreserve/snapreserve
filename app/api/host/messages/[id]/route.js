import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getHostUser } from '@/lib/get-host-user'

export async function PATCH(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body.action
  const reply = body.reply?.trim()

  const admin = createAdminClient()

  let msg
  const { data: withClosed, error: selectErr } = await admin
    .from('host_messages')
    .select('id, host_user_id, closed_at')
    .eq('id', id)
    .single()
  if (selectErr && (selectErr.message?.includes('closed_at') || selectErr.code === 'PGRST204')) {
    const { data: fallback } = await admin.from('host_messages').select('id, host_user_id').eq('id', id).single()
    msg = fallback ? { ...fallback, closed_at: null } : null
  } else {
    msg = withClosed
  }
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (msg.host_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Reopen: host can reopen a message that was closed by admin
  if (action === 'reopen') {
    const { error: updateErr } = await admin
      .from('host_messages')
      .update({ closed_at: null, closed_by: null })
      .eq('id', id)
    if (updateErr) {
      if (updateErr.message?.includes('closed_at') || updateErr.message?.includes('closed_by')) {
        return NextResponse.json({ error: 'Reopen is not available. Run the database migration for host_messages (closed_at/closed_by).' }, { status: 503 })
      }
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, reopened: true })
  }

  // Reply: require reply body and message must not be closed
  if (!reply) return NextResponse.json({ error: 'reply is required' }, { status: 400 })
  if (msg.closed_at) return NextResponse.json({ error: 'This conversation has been closed by support. You can start a new message if needed.' }, { status: 400 })

  const { error } = await admin
    .from('host_messages')
    .update({ reply_body: reply, replied_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
