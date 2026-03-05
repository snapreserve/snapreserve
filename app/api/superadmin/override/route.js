import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { getAdminSession } from '@/lib/get-admin-session'
import { getOverrideSession, OVERRIDE_COOKIE_NAME } from '@/lib/get-override-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'

const OVERRIDE_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const ALLOWED_ROLES = ['super_admin']

// GET — check current override status
export async function GET() {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ active: false, session: null })

  const session = await getOverrideSession(user.id)
  return NextResponse.json({
    active:  !!session,
    session: session ? {
      id:         session.id,
      reason:     session.reason,
      expires_at: session.expires_at,
      created_at: session.created_at,
    } : null,
  })
}

// POST — activate override mode (requires password re-auth done client-side)
export async function POST(request) {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Only Super Admin can activate Override Mode.' }, { status: 403 })
  }

  const body = await request.json()
  const { reason } = body

  if (!reason?.trim() || reason.trim().length < 10) {
    return NextResponse.json(
      { error: 'Override reason must be at least 10 characters.' },
      { status: 400 }
    )
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()
  const expiresAt = new Date(Date.now() + OVERRIDE_DURATION_MS).toISOString()

  // Revoke any existing override session first
  await admin
    .from('admin_override_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('admin_id', user.id)
    .is('revoked_at', null)

  const { data: session, error: insertErr } = await admin
    .from('admin_override_sessions')
    .insert({
      admin_id:   user.id,
      admin_email: user.email,
      reason:     reason.trim(),
      expires_at: expiresAt,
      ip_address: ip,
    })
    .select('id')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  await logAction({
    actorId:        user.id,
    actorEmail:     user.email,
    actorRole:      role,
    action:         'override.activated',
    targetType:     'admin',
    targetId:       user.id,
    afterData:      { reason: reason.trim(), expires_at: expiresAt },
    ipAddress:      ip,
    userAgent:      ua,
    isOverride:     true,
    overrideReason: reason.trim(),
  })

  // Set the override cookie (httpOnly, 15-min expiry)
  const cookieStore = await cookies()
  cookieStore.set(OVERRIDE_COOKIE_NAME, session.id, {
    httpOnly:  true,
    sameSite:  'strict',
    secure:    process.env.NODE_ENV === 'production',
    maxAge:    Math.floor(OVERRIDE_DURATION_MS / 1000),
    path:      '/',
  })

  return NextResponse.json({ success: true, expires_at: expiresAt })
}

// DELETE — revoke override session
export async function DELETE() {
  const { user, role, error } = await getAdminSession()
  if (error || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()
  await admin
    .from('admin_override_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('admin_id', user.id)
    .is('revoked_at', null)

  await logAction({
    actorId:    user.id,
    actorEmail: user.email,
    actorRole:  role,
    action:     'override.revoked',
    targetType: 'admin',
    targetId:   user.id,
    ipAddress:  ip,
    userAgent:  ua,
  })

  const cookieStore = await cookies()
  cookieStore.delete(OVERRIDE_COOKIE_NAME)

  return NextResponse.json({ success: true })
}
