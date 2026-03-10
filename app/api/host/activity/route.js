import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/host/activity — recent booking + team events for Activity Log
export async function GET(request) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  let hostUserId = null
  let allowedListingIds = null
  const { data: hostRow } = await admin.from('hosts').select('id, user_id').eq('user_id', user.id).maybeSingle()
  if (hostRow) {
    hostUserId = user.id
  } else {
    const { data: membership } = await admin
      .from('host_team_members')
      .select('host_id, allowed_listing_ids')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (membership) {
      const { data: ownerHost } = await admin.from('hosts').select('user_id').eq('id', membership.host_id).maybeSingle()
      hostUserId = ownerHost?.user_id ?? null
      if (Array.isArray(membership.allowed_listing_ids) && membership.allowed_listing_ids.length > 0) {
        allowedListingIds = membership.allowed_listing_ids
      }
    }
  }

  if (!hostUserId) return NextResponse.json({ error: 'No host organisation found' }, { status: 404 })

  const limit = 80
  let q = admin
    .from('bookings')
    .select(
      'id, reference, status, created_at, cancelled_at, checked_in_at, check_out, cancelled_by_role, guest_id, listings(id, title)'
    )
    .eq('host_id', hostUserId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (allowedListingIds) q = q.in('listing_id', allowedListingIds)

  const { data: bookingsRaw, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Exclude bookings whose guest account has been deleted
  const guestIds = [...new Set((bookingsRaw || []).map(b => b.guest_id).filter(Boolean))]
  const { data: guests } = guestIds.length
    ? await admin.from('users').select('id, deleted_at').in('id', guestIds)
    : { data: [] }
  const deletedGuestIds = new Set((guests || []).filter(u => u.deleted_at).map(u => u.id))
  const bookings = (bookingsRaw || []).filter(b => !deletedGuestIds.has(b.guest_id))

  const events = []
  for (const b of bookings) {
    const ref = b.reference || b.id?.slice(0, 8)?.toUpperCase() || '—'
    const title = b.listings?.title || 'Property'
    if (b.created_at) {
      events.push({
        id: `b-${b.id}-created`,
        type: 'booking_created',
        label: 'Booking received',
        sub: `Ref ${ref} · ${title}`,
        at: b.created_at,
        icon: '📋',
        booking_id: b.id,
        reference: ref,
      })
    }
    if (b.cancelled_at) {
      const by = b.cancelled_by_role === 'host' ? 'You cancelled' : 'Guest cancelled'
      events.push({
        id: `b-${b.id}-cancelled`,
        type: 'booking_cancelled',
        label: 'Booking cancelled',
        sub: `Ref ${ref} · ${by}`,
        at: b.cancelled_at,
        icon: '✕',
        booking_id: b.id,
        reference: ref,
      })
    }
    if (b.checked_in_at) {
      events.push({
        id: `b-${b.id}-checkin`,
        type: 'guest_checked_in',
        label: 'Guest checked in',
        sub: `Ref ${ref} · ${title}`,
        at: b.checked_in_at,
        icon: '🏠',
        booking_id: b.id,
        reference: ref,
      })
    }
    if (b.status === 'completed' && b.check_out) {
      events.push({
        id: `b-${b.id}-completed`,
        type: 'stay_completed',
        label: 'Stay completed',
        sub: `Ref ${ref} · ${title}`,
        at: b.check_out,
        icon: '✅',
        booking_id: b.id,
        reference: ref,
      })
    }
  }

  events.sort((a, b) => new Date(b.at) - new Date(a.at))
  const recent = events.slice(0, 50)

  return NextResponse.json({ events: recent })
}
