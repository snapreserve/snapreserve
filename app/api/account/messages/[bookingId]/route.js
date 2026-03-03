import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — fetch all messages for a booking
export async function GET(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await params
  const admin = createAdminClient()

  // Verify user is a participant in this booking
  const { data: booking } = await admin
    .from('bookings')
    .select('guest_id, host_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || (booking.guest_id !== user.id && booking.host_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: msgs, error } = await admin
    .from('messages')
    .select('id, sender_id, message, is_read, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark unread messages as read
  const unreadIds = (msgs ?? [])
    .filter(m => !m.is_read && m.sender_id !== user.id)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await admin
      .from('messages')
      .update({ is_read: true })
      .in('id', unreadIds)
  }

  return NextResponse.json(msgs ?? [])
}

// POST — send a message in a booking thread
export async function POST(request, { params }) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await params
  const body = await request.json()
  const text = body.message?.trim()

  if (!text) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (text.length > 5000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })

  const admin = createAdminClient()

  // Verify user is a participant
  const { data: booking } = await admin
    .from('bookings')
    .select('guest_id, host_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || (booking.guest_id !== user.id && booking.host_id !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const receiverId = booking.guest_id === user.id ? booking.host_id : booking.guest_id

  const { data, error } = await admin
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: user.id, receiver_id: receiverId, message: text })
    .select('id, sender_id, message, is_read, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
