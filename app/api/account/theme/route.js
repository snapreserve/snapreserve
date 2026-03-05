import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function PATCH(request) {
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
  if (!user) return NextResponse.json({ ok: false }) // silently ignore for guests

  const { theme } = await request.json().catch(() => ({}))
  if (theme !== 'light' && theme !== 'dark') return NextResponse.json({ ok: false })

  const admin = createAdminClient()
  await admin.from('users').update({ theme_preference: theme }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
