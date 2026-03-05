import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('first_name, last_name, full_name, email, phone, avatar_url, city, country, created_at, is_host, user_role, verification_status')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // No public.users row — auto-create from auth metadata
  if (!data) {
    const meta = user.user_metadata ?? {}
    const fullName = meta.full_name ?? meta.name ?? ''
    const parts = fullName.trim().split(' ')
    const fallback = {
      id:         user.id,
      email:      user.email,
      full_name:  fullName,
      first_name: parts[0] || '',
      last_name:  parts.slice(1).join(' ') || '',
      avatar_url: meta.avatar_url ?? null,
      is_host:    false,
    }
    await admin.from('users').upsert(fallback, { onConflict: 'id' })
    return NextResponse.json({ ...fallback, booking_count: 0, total_spent: 0, saved_count: 0 })
  }

  // Fetch stats
  const [{ count: bookingCount }, { data: spendData }, { count: savedCount }] = await Promise.all([
    admin.from('bookings').select('id', { count: 'exact', head: true }).eq('guest_id', user.id).neq('status', 'cancelled'),
    admin.from('bookings').select('total_amount').eq('guest_id', user.id).neq('status', 'cancelled'),
    admin.from('saved_listings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const totalSpent = (spendData ?? []).reduce((s, b) => s + Number(b.total_amount || 0), 0)

  return NextResponse.json({ ...data, booking_count: bookingCount ?? 0, total_spent: totalSpent, saved_count: savedCount ?? 0 })
}

export async function PATCH(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'city', 'country']
  const updates = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // Validate phone if provided
  if (updates.phone && !/^\+?[\d\s\-().]{7,20}$/.test(updates.phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // Keep full_name in sync with first/last
  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    const admin = createAdminClient()
    const { data: current } = await admin
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()

    const first = updates.first_name ?? current?.first_name ?? ''
    const last  = updates.last_name  ?? current?.last_name  ?? ''
    updates.full_name = `${first} ${last}`.trim()
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
