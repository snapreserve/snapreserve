import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'

const VALID_TYPES = ['hotel', 'property_manager', 'individual']

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { host_type, display_name, phone } = body

  if (!VALID_TYPES.includes(host_type)) {
    return NextResponse.json({ error: 'Invalid host_type' }, { status: 400 })
  }
  const name = display_name?.trim()
  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'Display name must be 2–100 characters' }, { status: 400 })
  }
  const ph = phone?.trim()
  if (!ph || !/^\+?[\d\s\-().]{7,20}$/.test(ph)) {
    return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Ensure public.users row exists
  await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? '',
      is_host: false,
      is_verified: false,
      user_role: 'user',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Check current role — block if already host or already pending
  const { data: profile } = await admin
    .from('users')
    .select('user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.user_role === 'host') {
    return NextResponse.json({ error: 'You are already an approved host.' }, { status: 400 })
  }
  if (profile?.user_role === 'pending_host') {
    return NextResponse.json({ error: 'Your application is already under review.' }, { status: 400 })
  }

  // Set role to pending_host
  const { error: roleErr } = await admin
    .from('users')
    .update({ user_role: 'pending_host' })
    .eq('id', user.id)

  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 })

  // Insert host application (upsert in case of retry)
  const { error: appErr } = await admin
    .from('host_applications')
    .upsert(
      { user_id: user.id, status: 'pending', host_type, display_name: name, phone: ph },
      { onConflict: 'user_id' }
    )

  if (appErr) {
    // Rollback role on failure
    await admin.from('users').update({ user_role: 'user' }).eq('id', user.id)
    return NextResponse.json({ error: appErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: 'pending_host' })
}
