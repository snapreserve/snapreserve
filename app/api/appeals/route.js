import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

// POST — submit an appeal (suspended user)
export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { appeal_text } = body

  if (!appeal_text?.trim() || appeal_text.trim().length < 20) {
    return NextResponse.json(
      { error: 'Please provide at least 20 characters explaining your situation.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Verify the user is actually suspended
  const { data: userRow } = await admin
    .from('users')
    .select('suspended_at, is_active, email')
    .eq('id', user.id)
    .single()

  if (!userRow?.suspended_at && userRow?.is_active !== false) {
    return NextResponse.json({ error: 'Your account is not suspended.' }, { status: 400 })
  }

  // Limit: one pending appeal at a time
  const { count } = await admin
    .from('appeals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending', 'under_review'])

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'You already have a pending appeal. Please wait for a response.' },
      { status: 409 }
    )
  }

  const { data: appeal, error } = await admin
    .from('appeals')
    .insert({
      user_id:     user.id,
      user_email:  userRow.email ?? user.email ?? '',
      appeal_text: appeal_text.trim(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ appeal_id: appeal.id }, { status: 201 })
}

// GET — fetch own appeals
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('appeals')
    .select('id, status, appeal_text, admin_response, reviewed_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ appeals: data ?? [] })
}
