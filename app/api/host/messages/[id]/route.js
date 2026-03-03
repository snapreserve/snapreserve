import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getUserSession } from '@/lib/get-user-session'

export async function PATCH(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const reply = body.reply?.trim()
  if (!reply) return NextResponse.json({ error: 'reply is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the message belongs to this host
  const { data: msg } = await admin
    .from('host_messages')
    .select('id, host_user_id')
    .eq('id', id)
    .single()

  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (msg.host_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin
    .from('host_messages')
    .update({ reply_body: reply, replied_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
