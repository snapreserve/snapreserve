import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/account/reviews?booking_ids=id1,id2,...
// Returns which of the provided booking IDs have already been reviewed by this user
export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('booking_ids') || ''
  const bookingIds = raw.split(',').map(s => s.trim()).filter(Boolean)

  if (bookingIds.length === 0) return NextResponse.json({ reviewed_booking_ids: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from('reviews')
    .select('booking_id')
    .eq('guest_id', user.id)
    .in('booking_id', bookingIds)

  const reviewed_booking_ids = (data || []).map(r => r.booking_id)
  return NextResponse.json({ reviewed_booking_ids })
}
