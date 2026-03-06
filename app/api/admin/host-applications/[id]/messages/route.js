import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { notifyHost } from '@/lib/notify-host'

const SEND_ROLES = ['support', 'admin', 'super_admin', 'trust_safety']

export async function GET(_req, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: app } = await admin
    .from('host_applications')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await admin
    .from('host_messages')
    .select('id, type, subject, body, is_read, reply_body, replied_at, created_at')
    .eq('host_user_id', app.user_id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!SEND_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { message } = body
  if (!message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: app } = await admin
    .from('host_applications')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const subject = 'Message from SnapReserve™ about your host application'

  // notifyHost inserts the message row + sends email
  await notifyHost({ hostUserId: app.user_id, type: 'info', subject, body: message.trim() })

  // Fetch the row we just inserted
  const { data: inserted, error: insErr } = await admin
    .from('host_messages')
    .select('id, type, subject, body, is_read, reply_body, replied_at, created_at')
    .eq('host_user_id', app.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     'host_application.message',
    targetType: 'host_application',
    targetId:   id,
    afterData:  { user_id: app.user_id, subject },
  })

  return NextResponse.json({ message: inserted })
}
