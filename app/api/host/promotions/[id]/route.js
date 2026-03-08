import { NextResponse } from 'next/server'
import { getHostUser } from '@/lib/get-host-user'
import { createAdminClient } from '@/lib/supabase-admin'

async function resolveHostContext(admin, userId) {
  const { data: host } = await admin.from('hosts').select('id').eq('user_id', userId).maybeSingle()
  if (host) return { hostId: host.id, callerRole: 'owner' }

  const { data: membership } = await admin
    .from('host_team_members')
    .select('host_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (membership) return { hostId: membership.host_id, callerRole: membership.role }

  return { hostId: null, callerRole: null }
}

async function getOwnedPromo(admin, id, hostId) {
  const { data } = await admin.from('promotions').select('*').eq('id', id).eq('host_id', hostId).maybeSingle()
  return data
}

// GET /api/host/promotions/[id]
export async function GET(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { hostId } = await resolveHostContext(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Host not found' }, { status: 404 })

  const promo = await getOwnedPromo(admin, params.id, hostId)
  if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })

  const { data: uses } = await admin
    .from('promotion_uses')
    .select('id, discount_amount, original_amount, created_at, booking_id, guest_id')
    .eq('promotion_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ promotion: promo, uses: uses || [] })
}

// PATCH /api/host/promotions/[id]
export async function PATCH(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { hostId, callerRole } = await resolveHostContext(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  if (!['owner', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Only managers and the owner can edit promotions' }, { status: 403 })
  }

  const promo = await getOwnedPromo(admin, params.id, hostId)
  if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const updates = {}

  if (body.name               !== undefined) updates.name               = String(body.name).trim()
  if (body.description        !== undefined) updates.description        = body.description?.trim() || null
  if (body.discount_value     !== undefined) updates.discount_value     = Number(body.discount_value)
  if (body.min_nights         !== undefined) updates.min_nights         = Number(body.min_nights)
  if (body.min_booking_amount !== undefined) updates.min_booking_amount = Number(body.min_booking_amount)
  if (body.max_uses           !== undefined) updates.max_uses           = body.max_uses ? Number(body.max_uses) : null
  if (body.max_uses_per_user  !== undefined) updates.max_uses_per_user  = Number(body.max_uses_per_user)
  if (body.listing_ids        !== undefined) updates.listing_ids        = Array.isArray(body.listing_ids) && body.listing_ids.length > 0 ? body.listing_ids : null
  if (body.starts_at          !== undefined) updates.starts_at          = body.starts_at || null
  if (body.ends_at            !== undefined) updates.ends_at            = body.ends_at || null
  if (body.is_active          !== undefined) updates.is_active          = Boolean(body.is_active)
  if (body.auto_apply         !== undefined) updates.auto_apply         = Boolean(body.auto_apply)

  const { data: updated, error } = await admin
    .from('promotions')
    .update(updates)
    .eq('id', params.id)
    .eq('host_id', hostId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, promotion: updated })
}

// DELETE /api/host/promotions/[id]
export async function DELETE(request, { params }) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { hostId, callerRole } = await resolveHostContext(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  if (!['owner', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Only managers and the owner can delete promotions' }, { status: 403 })
  }

  const promo = await getOwnedPromo(admin, params.id, hostId)
  if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })

  // If it has uses, just deactivate; otherwise hard delete
  const { count } = await admin
    .from('promotion_uses')
    .select('id', { count: 'exact', head: true })
    .eq('promotion_id', params.id)

  if ((count || 0) > 0) {
    await admin.from('promotions').update({ is_active: false }).eq('id', params.id)
    return NextResponse.json({ success: true, message: 'Promotion deactivated (has usage history)' })
  }

  const { error } = await admin.from('promotions').delete().eq('id', params.id).eq('host_id', hostId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
