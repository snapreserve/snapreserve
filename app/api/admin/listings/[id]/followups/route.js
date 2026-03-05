import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request, { params }) {
  const { error } = await getAdminSession()
  if (error) return NextResponse.json({ error }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: followups, error: fetchErr } = await admin
    .from('listing_follow_ups')
    .select('id, message, created_at, read_by_admin, read_at, host_user_id')
    .eq('listing_id', id)
    .order('created_at', { ascending: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Mark all unread as read
  const unreadIds = (followups || []).filter(f => !f.read_by_admin).map(f => f.id)
  if (unreadIds.length > 0) {
    await admin
      .from('listing_follow_ups')
      .update({ read_by_admin: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return NextResponse.json({ followups: followups || [] })
}
