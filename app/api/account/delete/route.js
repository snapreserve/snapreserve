import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'

export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const reason = body.reason?.trim() ?? 'User-requested deletion'

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // ── Block if upcoming bookings exist ───────────────────────────────────────
  const { data: upcoming } = await admin
    .from('bookings')
    .select('id, check_in, check_out, reference')
    .eq('guest_id', user.id)
    .gte('check_out', today)
    .in('status', ['pending', 'confirmed'])
    .limit(5)

  if (upcoming?.length > 0) {
    const dates = upcoming.map(b =>
      `${b.reference ?? b.id.slice(0, 8)} (${b.check_in} – ${b.check_out})`
    ).join(', ')
    return NextResponse.json(
      {
        error: 'upcoming_bookings',
        message: `You have upcoming bookings that must be completed or cancelled first: ${dates}`,
      },
      { status: 409 }
    )
  }

  // ── Block if open disputes exist ────────────────────────────────────────────
  const { data: disputed } = await admin
    .from('bookings')
    .select('id, reference')
    .eq('guest_id', user.id)
    .eq('status', 'disputed')
    .limit(1)

  if (disputed?.length > 0) {
    return NextResponse.json(
      {
        error: 'open_dispute',
        message: 'You have an open dispute that must be resolved before deleting your account. Please contact support.',
      },
      { status: 409 }
    )
  }

  // ── Soft delete ────────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: profile } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const { error } = await admin
    .from('users')
    .update({
      deleted_at: now,
      is_active: false,
      deletion_reason: reason,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: 'guest',
    action: 'account.soft_deleted',
    targetType: 'user',
    targetId: user.id,
    beforeData: profile,
    afterData: { deleted_at: now, is_active: false, deletion_reason: reason },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
