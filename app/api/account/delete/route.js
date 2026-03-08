import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'

const GRACE_DAYS = 30

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

  // ── Block owner account self-deletion ──────────────────────────────────────
  const { data: selfUser } = await admin
    .from('users')
    .select('is_owner, is_host, user_role, deletion_scheduled_at')
    .eq('id', user.id)
    .maybeSingle()

  if (selfUser?.is_owner) {
    return NextResponse.json(
      { error: 'This account is protected and cannot be modified.' },
      { status: 403 }
    )
  }

  const isHost = selfUser?.user_role === 'host' || !!selfUser?.is_host

  // ══════════════════════════════════════════════════════════════════════════
  // HOST DELETION PATH — 30-day grace period with listing unpublish
  // ══════════════════════════════════════════════════════════════════════════
  if (isHost) {
    const { data: hostRow } = await admin
      .from('hosts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (hostRow) {
      // ── Block if host has upcoming guest bookings ──────────────────────────
      const { data: upcomingAsHost } = await admin
        .from('bookings')
        .select('id, check_in, check_out, reference')
        .eq('host_id', hostRow.id)
        .gte('check_out', today)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .limit(5)

      if (upcomingAsHost?.length > 0) {
        const dates = upcomingAsHost
          .map(b => `${b.reference ?? b.id.slice(0, 8)} (${b.check_in} – ${b.check_out})`)
          .join(', ')
        return NextResponse.json(
          {
            error: 'upcoming_bookings',
            message: `You have upcoming guest bookings that must be completed or cancelled first: ${dates}`,
          },
          { status: 409 }
        )
      }

      // ── Block if open disputes exist on host bookings ──────────────────────
      const { data: disputedAsHost } = await admin
        .from('bookings')
        .select('id, reference')
        .eq('host_id', hostRow.id)
        .eq('status', 'disputed')
        .limit(1)

      if (disputedAsHost?.length > 0) {
        return NextResponse.json(
          {
            error: 'open_dispute',
            message:
              'You have an open dispute on one of your properties that must be resolved before deleting your account. Please contact support.',
          },
          { status: 409 }
        )
      }

      // ── Block if pending refund requests exist on host bookings ───────────
      const { data: hostBookings } = await admin
        .from('bookings')
        .select('id')
        .eq('host_id', hostRow.id)

      const hostBookingIds = (hostBookings ?? []).map(b => b.id)

      if (hostBookingIds.length > 0) {
        const { data: pendingRefunds } = await admin
          .from('refund_requests')
          .select('id')
          .in('booking_id', hostBookingIds)
          .eq('status', 'pending')
          .limit(1)

        if (pendingRefunds?.length > 0) {
          return NextResponse.json(
            {
              error: 'pending_refund',
              message:
                'You have a pending refund request on one of your bookings that must be resolved before deleting your account.',
            },
            { status: 409 }
          )
        }
      }

      // ── Already scheduled — return current state ──────────────────────────
      if (selfUser?.deletion_scheduled_at) {
        const graceEnd = new Date(selfUser.deletion_scheduled_at)
        graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS)
        return NextResponse.json({
          scheduled: true,
          scheduledAt: selfUser.deletion_scheduled_at,
          graceEndsAt: graceEnd.toISOString(),
        })
      }

      // ── Schedule deletion: unpublish listings, set grace period ───────────
      const now = new Date().toISOString()
      const graceEnd = new Date()
      graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS)

      // Unpublish all listings immediately — new bookings disabled
      await admin
        .from('listings')
        .update({ is_active: false })
        .eq('host_id', hostRow.id)

      const { data: profile } = await admin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const { error } = await admin
        .from('users')
        .update({
          deletion_scheduled_at: now,
          deletion_reason: reason,
        })
        .eq('id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await logAction({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: 'host',
        action: 'account.deletion_scheduled',
        targetType: 'user',
        targetId: user.id,
        beforeData: { deletion_scheduled_at: null },
        afterData: {
          deletion_scheduled_at: now,
          deletion_reason: reason,
          listings_unpublished: true,
        },
        ipAddress: ip,
        userAgent: ua,
      })

      return NextResponse.json({
        scheduled: true,
        scheduledAt: now,
        graceEndsAt: graceEnd.toISOString(),
      })
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GUEST DELETION PATH — immediate soft delete
  // ══════════════════════════════════════════════════════════════════════════

  // ── Block if upcoming guest bookings exist ─────────────────────────────────
  const { data: upcoming } = await admin
    .from('bookings')
    .select('id, check_in, check_out, reference')
    .eq('guest_id', user.id)
    .gte('check_out', today)
    .in('status', ['pending', 'confirmed'])
    .limit(5)

  if (upcoming?.length > 0) {
    const dates = upcoming
      .map(b => `${b.reference ?? b.id.slice(0, 8)} (${b.check_in} – ${b.check_out})`)
      .join(', ')
    return NextResponse.json(
      {
        error: 'upcoming_bookings',
        message: `You have upcoming bookings that must be completed or cancelled first: ${dates}`,
      },
      { status: 409 }
    )
  }

  // ── Block if open disputes exist ───────────────────────────────────────────
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
        message:
          'You have an open dispute that must be resolved before deleting your account. Please contact support.',
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
