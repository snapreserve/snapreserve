import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — list all conversations for the current user (guest or host)
export async function GET(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch conversations without user FK joins (those FKs reference auth.users
  // which PostgREST can't expose — we fetch user names separately from public.users)
  const { data: conversations, error } = await admin
    .from('conversations')
    .select(`
      id, status, last_message_at, last_message_preview,
      guest_unread_count, host_unread_count,
      is_booked_guest_chat, blocked_by,
      guest_user_id, host_user_id,
      listing:listings(id, title, city, state, images)
    `)
    .or(`guest_user_id.eq.${user.id},host_user_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Batch-fetch user names from public.users
  const userIds = [...new Set(
    (conversations || []).flatMap(c => [c.guest_user_id, c.host_user_id]).filter(Boolean)
  )]

  let userMap = {}
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', userIds)
    ;(users || []).forEach(u => { userMap[u.id] = u })
  }

  const enriched = (conversations || []).map(c => ({
    ...c,
    guest: userMap[c.guest_user_id] || null,
    host:  userMap[c.host_user_id]  || null,
  }))

  return NextResponse.json({ conversations: enriched, userId: user.id })
}

// POST — start (or retrieve) a conversation
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { listing_id } = body
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Validate listing
  const { data: listing } = await admin
    .from('listings')
    .select('id, host_id, is_active, status, title')
    .eq('id', listing_id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (!listing.is_active || listing.status === 'suspended') {
    return NextResponse.json({ error: 'This listing is not currently available.' }, { status: 400 })
  }
  if (listing.host_id === user.id) {
    return NextResponse.json({ error: 'You cannot message your own listing.' }, { status: 400 })
  }

  // Return existing conversation if one already exists
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('guest_user_id', user.id)
    .eq('listing_id', listing_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ conversation_id: existing.id })

  // Rate limit: max 5 new conversations per day
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('guest_user_id', user.id)
    .gte('created_at', since)

  if ((count || 0) >= 5) {
    return NextResponse.json(
      { error: 'You can only start 5 new conversations per day. Please try again tomorrow.' },
      { status: 429 }
    )
  }

  // Create conversation
  const { data: conv, error } = await admin
    .from('conversations')
    .insert({ listing_id, guest_user_id: user.id, host_user_id: listing.host_id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ conversation_id: conv.id }, { status: 201 })
}
