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

// GET /api/host/promotions — list promotions with analytics
export async function GET() {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { hostId } = await resolveHostContext(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Host not found' }, { status: 404 })

  const { data: promotions, error } = await admin
    .from('promotions')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with aggregate analytics
  const ids = (promotions || []).map(p => p.id)
  let uses = []
  if (ids.length) {
    const { data } = await admin
      .from('promotion_uses')
      .select('promotion_id, discount_amount, original_amount')
      .in('promotion_id', ids)
    uses = data || []
  }

  const enriched = (promotions || []).map(p => {
    const pu = uses.filter(u => u.promotion_id === p.id)
    return {
      ...p,
      total_uses:            pu.length,
      total_discount_given:  pu.reduce((s, u) => s + Number(u.discount_amount), 0),
      revenue_from_promo:    pu.reduce((s, u) => s + Number(u.original_amount), 0),
    }
  })

  return NextResponse.json({ promotions: enriched })
}

// POST /api/host/promotions — create a promotion
export async function POST(request) {
  const { user } = await getHostUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    code, name, description,
    discount_type, discount_value,
    min_nights, min_booking_amount,
    max_uses, max_uses_per_user,
    listing_ids, starts_at, ends_at,
    is_active, auto_apply,
  } = body

  if (!code?.trim())  return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
  if (!name?.trim())  return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!['percentage', 'fixed'].includes(discount_type)) {
    return NextResponse.json({ error: 'discount_type must be percentage or fixed' }, { status: 400 })
  }
  if (!discount_value || Number(discount_value) <= 0) {
    return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 })
  }
  if (discount_type === 'percentage' && Number(discount_value) > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { hostId, callerRole } = await resolveHostContext(admin, user.id)
  if (!hostId) return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  // Only owner and manager can create promotions
  if (!['owner', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Only managers and the owner can create promotions' }, { status: 403 })
  }

  const { data: promo, error } = await admin
    .from('promotions')
    .insert({
      host_id:            hostId,
      code:               code.trim().toUpperCase(),
      name:               name.trim(),
      description:        description?.trim() || null,
      discount_type,
      discount_value:     Number(discount_value),
      min_nights:         Number(min_nights) || 1,
      min_booking_amount: Number(min_booking_amount) || 0,
      max_uses:           max_uses ? Number(max_uses) : null,
      max_uses_per_user:  Number(max_uses_per_user) || 1,
      listing_ids:        Array.isArray(listing_ids) && listing_ids.length > 0 ? listing_ids : null,
      starts_at:          starts_at || null,
      ends_at:            ends_at || null,
      is_active:          is_active !== false,
      auto_apply:         auto_apply === true,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A promotion with this code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, promotion: promo }, { status: 201 })
}
