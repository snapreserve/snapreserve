import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getUserSession } from '@/lib/get-user-session'

/**
 * GET /api/account/support-messages
 * Returns all host_messages for the current user (support messages from SnapReserve™).
 * Marks unread messages as read server-side and returns the pre-read unreadCount.
 */
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data } = await admin
    .from('host_messages')
    .select('id, type, subject, body, is_read, reply_body, replied_at, created_at')
    .eq('host_user_id', user.id)
    .order('created_at', { ascending: true })

  const messages = data || []
  const unreadCount = messages.filter(m => !m.is_read).length

  // Mark all unread as read
  const unreadIds = messages.filter(m => !m.is_read).map(m => m.id)
  if (unreadIds.length > 0) {
    await admin.from('host_messages').update({ is_read: true }).in('id', unreadIds)
  }

  return NextResponse.json({ messages, unreadCount })
}
