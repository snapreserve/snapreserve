import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'

const GRACE_DAYS = 30

export async function POST() {
  const { user } = await getUserSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua = h.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()

  const { data: selfUser } = await admin
    .from('users')
    .select('is_host, user_role, deletion_scheduled_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!selfUser?.deletion_scheduled_at) {
    return NextResponse.json({ error: 'No pending deletion to cancel.' }, { status: 400 })
  }

  // Verify still within grace period
  const graceEnd = new Date(selfUser.deletion_scheduled_at)
  graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS)
  if (new Date() > graceEnd) {
    return NextResponse.json(
      { error: 'The 30-day grace period has ended. Please contact support@snapreserve.app.' },
      { status: 409 }
    )
  }

  // Cancel scheduled deletion
  const { error } = await admin
    .from('users')
    .update({ deletion_scheduled_at: null, deletion_reason: null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Re-publish approved listings for hosts
  const isHost = selfUser?.user_role === 'host' || !!selfUser?.is_host
  if (isHost) {
    const { data: hostRow } = await admin
      .from('hosts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (hostRow) {
      // Only restore listings that were previously approved (live)
      await admin
        .from('listings')
        .update({ is_active: true })
        .eq('host_id', hostRow.id)
        .eq('status', 'approved')
    }
  }

  await logAction({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: isHost ? 'host' : 'guest',
    action: 'account.deletion_cancelled',
    targetType: 'user',
    targetId: user.id,
    beforeData: { deletion_scheduled_at: selfUser.deletion_scheduled_at },
    afterData: { deletion_scheduled_at: null },
    ipAddress: ip,
    userAgent: ua,
  })

  return NextResponse.json({ success: true })
}
