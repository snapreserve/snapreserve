import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { notifyHost } from '@/lib/notify-host'

/**
 * POST /api/host/messages
 * Admin-only: send an in-app message to a host user.
 */
export async function POST(request) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { host_user_id, subject, body: msgBody, listing_id = null, type = 'info' } = body

  if (!host_user_id) return NextResponse.json({ error: 'host_user_id is required' }, { status: 400 })
  if (!msgBody?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  await notifyHost({
    hostUserId: host_user_id,
    listingId:  listing_id,
    type,
    subject:    subject?.trim() || 'Message from SnapReserve',
    body:       msgBody.trim(),
  })

  return NextResponse.json({ success: true })
}
