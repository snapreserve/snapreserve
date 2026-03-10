import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'upcoming' // upcoming | past | all

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  let query = admin
    .from('bookings')
    .select(`
      id, check_in, check_out, guests, nights, status,
      price_per_night, cleaning_fee, service_fee, total_amount,
      cancellation_policy, cancelled_at, cancellation_reason, refund_amount,
      reference, created_at,
      listings (
        id, title, city, country,
        images,
        wifi_name, wifi_password, door_code, parking_instructions, welcome_message
      )
    `)
    .eq('guest_id', user.id)
    .order('check_in', { ascending: filter === 'upcoming' })

  if (filter === 'upcoming') {
    query = query
      .gte('check_out', today)
      .in('status', ['pending', 'confirmed', 'checked_in'])
  } else if (filter === 'past') {
    query = query.or(`check_out.lt.${today},status.in.(cancelled,completed)`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
