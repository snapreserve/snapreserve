import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { headers } from 'next/headers'

// POST /api/host/bookings/[id]/checkin
export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  // Resolve host org user_id
  let hostUserId = null
  const { data: directHost } = await admin.from('hosts').select('id, user_id').eq('user_id', user.id).maybeSingle()
  if (directHost) {
    hostUserId = user.id
  } else {
    const { data: mem } = await admin.from('host_team_members').select('host_id').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    if (mem) {
      const { data: orgHost } = await admin.from('hosts').select('user_id').eq('id', mem.host_id).maybeSingle()
      hostUserId = orgHost?.user_id ?? null
    }
  }

  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 403 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, reference, status, check_in, check_out, listing_id, guest_id, listings(title)')
    .eq('id', id)
    .eq('host_id', hostUserId)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: `Cannot check in a booking with status "${booking.status}"` }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { error: updateErr } = await admin
    .from('bookings')
    .update({ status: 'checked_in', checked_in_at: now })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  'host',
    action:     'booking.checked_in',
    targetType: 'booking',
    targetId:   id,
    beforeData: { status: 'confirmed' },
    afterData:  { status: 'checked_in', checked_in_at: now },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true, checked_in_at: now })
}
