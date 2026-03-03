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
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const admin = createAdminClient()

  // Verify user is actually a host
  const { data: profile } = await admin
    .from('users')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (profile?.user_role !== 'host') {
    return NextResponse.json({ error: 'Account is already a customer account.' }, { status: 400 })
  }

  // Unpublish all live listings
  await admin
    .from('listings')
    .update({ is_active: false, status: 'approved' })
    .eq('host_id', user.id)
    .eq('status', 'live')

  // Set is_host = false, user_role = 'user'
  const { error } = await admin
    .from('users')
    .update({ is_host: false, user_role: 'user' })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
