import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const { user, supabase } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('full_name, email, phone, avatar_url, created_at, is_verified, is_host, user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // No public.users row — happens with some OAuth signups. Auto-create it.
  if (!data) {
    const admin = createAdminClient()
    const fallback = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? null,
      is_host: false,
    }
    await admin.from('users').upsert(fallback, { onConflict: 'id' })
    return NextResponse.json(fallback)
  }

  return NextResponse.json(data)
}

export async function PATCH(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Only allow updating safe profile fields — never is_host, is_active, deleted_at, etc.
  const allowed = ['full_name', 'phone', 'avatar_url']
  const updates = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // Validate phone if provided
  if (updates.phone && !/^\+?[\d\s\-().]{7,20}$/.test(updates.phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // Use admin client so we can update regardless of column-level restrictions
  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
