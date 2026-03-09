import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Server-side signup: creates the auth user via service role with email_confirm=true,
 * which bypasses Supabase's built-in email sender (and its 3/hr free-tier rate limit).
 * The client then calls signInWithPassword to establish a session.
 */
export async function POST(request) {
  const { email, password, full_name } = await request.json()

  if (!email || !password || !full_name) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,          // auto-confirm — we handle our own welcome email
    user_metadata: { full_name },
  })

  if (error) {
    // Translate Supabase admin errors into friendly messages
    const msg = error.message || ''
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    console.error('[signup] admin.createUser error:', error)
    return Response.json({ error: msg || 'Failed to create account. Please try again.' }, { status: 400 })
  }

  return Response.json({ success: true, userId: data.user.id })
}
