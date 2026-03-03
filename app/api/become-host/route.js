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

  // Validate
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

  // Set is_host = true on the user's profile
  const { error: profileErr } = await admin
    .from('users')
    .update({ is_host: true })
    .eq('id', user.id)

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Upsert hosts row with all fields
  const { error: hostErr } = await admin
    .from('hosts')
    .upsert(
      { user_id: user.id, host_status: 'pending', host_type, display_name: name, phone: ph },
      { onConflict: 'user_id' }
    )

  if (hostErr) return NextResponse.json({ error: hostErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
