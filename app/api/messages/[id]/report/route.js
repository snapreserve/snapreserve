import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { reason } = await request.json()
  if (!reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: conv } = await admin
    .from('conversations')
    .select('guest_user_id, host_user_id')
    .eq('id', id)
    .single()

  if (!conv || (conv.guest_user_id !== user.id && conv.host_user_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await admin.from('conversation_reports').insert({
    conversation_id: id,
    reported_by:     user.id,
    reason:          reason.trim(),
  })

  return NextResponse.json({ success: true })
}
