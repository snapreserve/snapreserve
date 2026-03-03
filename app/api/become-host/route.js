import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST() {
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

  const admin = createAdminClient()

  // Set is_host = true on the user's profile
  const { error: profileErr } = await admin
    .from('users')
    .update({ is_host: true })
    .eq('id', user.id)

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Create hosts row (upsert — safe if called twice)
  const { error: hostErr } = await admin
    .from('hosts')
    .upsert({ user_id: user.id, host_status: 'pending' }, { onConflict: 'user_id' })

  if (hostErr) return NextResponse.json({ error: hostErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
