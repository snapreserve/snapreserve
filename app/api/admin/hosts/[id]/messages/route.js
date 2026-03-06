import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET(_req, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: host } = await admin
    .from('hosts')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 })

  const { data: messages } = await admin
    .from('host_messages')
    .select('id, type, subject, body, is_read, created_at, listing_id')
    .eq('host_user_id', host.user_id)
    .order('created_at', { ascending: true })

  return NextResponse.json(messages ?? [])
}
