import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { isSafeRedirectPath } from '@/lib/validate'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Validate the `next` param to prevent open-redirect attacks.
  // Only allow internal relative paths (e.g. /dashboard, /host).
  // Protocol-relative paths (//evil.com) and external URLs are rejected.
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next    = isSafeRedirectPath(rawNext) ? rawNext : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // Upsert a profile row for OAuth users — use admin client to bypass RLS
  const { user } = data
  const admin = createAdminClient()
  await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? '',
      is_host: false,
      is_verified: false,
      verification_reference: user.user_metadata?.verification_reference ?? null,
      approval_status: 'pending',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Block suspended accounts from logging in via OAuth
  const { data: userRow } = await admin
    .from('users')
    .select('suspended_at, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (userRow?.suspended_at || userRow?.is_active === false) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/login?error=account_suspended`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
