import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'

export async function GET(request) {
  const { role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const adminClient = createAdminClient()

  // Use SECURITY DEFINER function — O(1) index seek on auth.users.email
  // instead of listUsers() which dumps the entire user table into memory.
  const { data, error: lookupError } = await adminClient
    .rpc('find_user_by_email', { p_email: email })
    .maybeSingle()

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })

  return NextResponse.json({ user_id: data.user_id, email: data.user_email })
}
