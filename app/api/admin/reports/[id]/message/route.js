import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { notifyHost } from '@/lib/notify-host'

// GET — fetch host_messages sent for this report's listing
export async function GET(request, { params }) {
  const { role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: report } = await admin.from('reports').select('target_id, target_type').eq('id', id).single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  let messages = []
  if (report.target_type === 'listing') {
    const { data } = await admin
      .from('host_messages')
      .select('id, type, subject, body, is_read, created_at, reply_body, replied_at')
      .eq('listing_id', report.target_id)
      .order('created_at', { ascending: true })
    messages = data || []
  }

  return NextResponse.json({ messages })
}

// POST — send a message to the host
export async function POST(request, { params }) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const subject = body.subject?.trim()
  const message = body.message?.trim()
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: report } = await admin.from('reports').select('target_id, target_type').eq('id', id).single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.target_type !== 'listing') {
    return NextResponse.json({ error: 'Messaging only supported for listing reports' }, { status: 400 })
  }

  const { data: listing } = await admin.from('listings').select('id, host_id, title').eq('id', report.target_id).single()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  await notifyHost({
    hostUserId: listing.host_id,
    listingId:  listing.id,
    type:       'info',
    subject:    subject || `Message regarding your listing: ${listing.title}`,
    body:       message,
  })

  // Log to activity timeline
  await admin.from('report_activity').insert({
    report_id:   id,
    actor_id:    user.id,
    actor_email: user.email,
    action:      'message_sent',
    detail:      message.slice(0, 120),
  })

  return NextResponse.json({ success: true })
}
