import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'
import { getAdminSession } from '@/lib/get-admin-session'
import { headers } from 'next/headers'

const ALLOWED_KEYS = ['maintenance_mode', 'support_email', 'waitlist_enabled']

export async function GET() {
  const { role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data, error: fetchError } = await adminClient
    .from('platform_settings')
    .select('key, value, updated_by, updated_at')
    .in('key', ALLOWED_KEYS)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Transform to key → { value, updated_at } map
  const settings = {}
  for (const row of data ?? []) {
    settings[row.key] = { value: row.value, updated_at: row.updated_at }
  }

  return NextResponse.json({ settings })
}

export async function PATCH(request) {
  const { user, role, error } = await getAdminSession()
  if (error || role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { key, value } = body

  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: `key must be one of: ${ALLOWED_KEYS.join(', ')}` }, { status: 400 })
  }
  if (value === undefined) {
    return NextResponse.json({ error: 'value required' }, { status: 400 })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { error: upsertError } = await adminClient
    .from('platform_settings')
    .upsert({ key, value, updated_by: user.id, updated_at: now }, { onConflict: 'key' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     `settings.update`,
    targetType: 'setting',
    targetId:   key,
    afterData:  { key, value },
    ipAddress:  ip,
    userAgent:  ua,
  })

  return NextResponse.json({ success: true })
}
