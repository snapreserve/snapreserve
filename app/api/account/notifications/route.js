import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

const DEFAULTS = {
  booking_confirmations: true,
  booking_reminders: true,
  messages: true,
  promotions: false,
  account_updates: true,
  method_email: true,
  method_sms: false,
}

// GET — fetch notification preferences (with defaults if no row exists)
export async function GET() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? { ...DEFAULTS, user_id: user.id })
}

// PATCH — upsert notification preferences
export async function PATCH(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = Object.keys(DEFAULTS)
  const updates = { user_id: user.id, updated_at: new Date().toISOString() }

  for (const key of allowed) {
    if (typeof body[key] === 'boolean') updates[key] = body[key]
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('notification_preferences')
    .upsert(updates, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
