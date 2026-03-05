import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/get-admin-session'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAction } from '@/lib/audit-log'

export async function PATCH(request, { params }) {
  const { id } = await params
  const { role, error, user } = await getAdminSession()
  if (error === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (error === 'mfa_required')    return NextResponse.json({ error: 'MFA required' }, { status: 403 })
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { action } = body
  if (!['hide', 'unhide'].includes(action)) {
    return NextResponse.json({ error: 'action must be hide or unhide' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: review } = await admin.from('reviews').select('id, listing_id, is_hidden').eq('id', id).maybeSingle()
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  const isHidden = action === 'hide'

  const { error: updateError } = await admin
    .from('reviews')
    .update({ is_hidden: isHidden })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Recompute listing rating after hiding/unhiding
  const { data: allReviews } = await admin
    .from('reviews')
    .select('rating')
    .eq('listing_id', review.listing_id)
    .eq('is_hidden', false)

  const ratings = (allReviews || []).map(r => Number(r.rating)).filter(Boolean)
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0

  await admin.from('listings').update({ rating: avgRating, review_count: ratings.length }).eq('id', review.listing_id)

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
  const ua = request.headers.get('user-agent') || ''
  await logAction({ actorId: user.id, action: `review.${action}`, targetType: 'review', targetId: id, detail: `listing_id=${review.listing_id}`, ip, ua })

  return NextResponse.json({ success: true, is_hidden: isHidden })
}
