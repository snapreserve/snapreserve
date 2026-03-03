import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — list all message threads for the current user
// Returns one entry per booking, with the latest message preview
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get distinct bookings the user has messages in, ordered by most recent message
  const { data: threads, error } = await admin
    .from('messages')
    .select(`
      booking_id,
      message,
      is_read,
      sender_id,
      created_at,
      bookings!inner (
        id, check_in, check_out, status,
        listings!inner ( id, title, city, country, main_image_url )
      )
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduplicate: keep only the latest message per booking
  const seen = new Set()
  const deduplicated = []
  for (const msg of (threads ?? [])) {
    if (!seen.has(msg.booking_id)) {
      seen.add(msg.booking_id)
      deduplicated.push({
        booking_id: msg.booking_id,
        booking: msg.bookings,
        latest_message: msg.message,
        latest_at: msg.created_at,
        unread: !msg.is_read && msg.sender_id !== user.id,
      })
    }
  }

  return NextResponse.json(deduplicated)
}
