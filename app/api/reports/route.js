import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'

const VALID_TARGET_TYPES = ['listing', 'user', 'booking', 'host']
const VALID_REASONS = ['incorrect_info', 'misleading_photos', 'scam_fraud', 'safety_concern', 'inappropriate_content', 'other']

export async function POST(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be logged in to submit a report.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { target_type, target_id, reason, description } = body

  // Validate inputs
  if (!VALID_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: 'Invalid target type.' }, { status: 400 })
  }
  if (!target_id || typeof target_id !== 'string') {
    return NextResponse.json({ error: 'target_id required.' }, { status: 400 })
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Please select a valid reason.' }, { status: 400 })
  }
  if (!description?.trim() || description.trim().length < 20) {
    return NextResponse.json({ error: 'Description must be at least 20 characters.' }, { status: 400 })
  }
  if (description.trim().length > 2000) {
    return NextResponse.json({ error: 'Description must be 2000 characters or less.' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Rate limit: max 5 reports per user per 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await adminClient
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', user.id)
    .gte('created_at', since)

  if (count >= 5) {
    return NextResponse.json({ error: 'You have submitted too many reports today. Please try again tomorrow.' }, { status: 429 })
  }

  // Verify target exists
  const tableMap = { listing: 'listings', user: 'users', booking: 'bookings', host: 'hosts' }
  const { data: target } = await adminClient
    .from(tableMap[target_type])
    .select('id')
    .eq('id', target_id)
    .maybeSingle()

  if (!target) {
    return NextResponse.json({ error: `${target_type} not found.` }, { status: 404 })
  }

  const { error: insertError } = await adminClient
    .from('reports')
    .insert({
      reporter_id:  user.id,
      target_type,
      target_id,
      reason,
      description:  description.trim(),
      details:      description.trim(), // backward compat
      status:       'open',
      priority:     'normal',
    })

  if (insertError) {
    // Unique constraint = already reported
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already reported this.' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
